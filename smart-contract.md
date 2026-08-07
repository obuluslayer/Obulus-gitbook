# The Escrow contract

`Escrow.sol` (Solidity 0.8.28, Foundry, OpenZeppelin 5) is the only place deal funds ever live. It is **immutable** — no proxy, no upgrade path, no pause — and the owner is provably unable to move deal funds (`invariant_ownerCannotMoveFunds`, 8k+ fuzzed calls). Source: `contracts/src/Escrow.sol` in the main repository; the deployed bytecode is verified on Blockscout.

## States

```
None → Funded → Delivered → Disputed → Resolved
         │          └────────────────────▲
         └───────────────────────────────┘   (every arrow below ends in Resolved)
```

| From | Call | Who | To |
|---|---|---|---|
| `None` | `fund(offer, sellerSig)` | buyer (or anyone, if the offer is open) | `Funded` |
| `Funded` | `markDelivered(dealId, hash)` | seller, before `deliverDeadline` | `Delivered` |
| `Funded` | `refundExpired(dealId)` | **anyone**, after `deliverDeadline` | `Resolved` — buyer refunded in full |
| `Delivered` | `confirm(dealId)` | buyer | `Resolved` — seller paid |
| `Delivered` | `claimTimeout(dealId)` | **anyone**, after `deliveredAt + confirmWindow` | `Resolved` — seller paid (optimistic release) |
| `Delivered` | `dispute(dealId)` | buyer, within `confirmWindow` | `Disputed` |
| `Disputed` | `resolve(dealId, sellerBps)` | the deal's arbiter | `Resolved` — split |
| `Disputed` | `resolveExpired(dealId)` | **anyone**, after `disputedAt + resolveTimeout` | `Resolved` — neutral undo |

Three of the eight transitions are **permissionless timeout exits** — that is the "no fund can be stuck" guarantee: whatever a counterparty (or the arbiter) fails to do, anyone can eventually move the deal to a terminal state.

## The Offer

A deal starts life as a seller-signed, off-chain **Offer** (13 fields):

| Field | Type | Meaning |
|---|---|---|
| `seller` | address | provider — must equal the recovered signer |
| `buyer` | address | designated buyer, or `address(0)` = open offer (anyone may fund) |
| `arbiter` | address | this deal's bridled arbiter |
| `token` | address | must equal the contract's immutable settlement token |
| `price` | uint256 | service price (base-6) |
| `buyerBond` | uint256 | buyer's anti-grief bond, escrowed at fund, returned on the happy path |
| `sellerBond` | uint256 | seller's bond, posted at `markDelivered` |
| `deliverDeadline` | uint64 | absolute timestamp the seller must deliver by |
| `confirmWindow` | uint64 | seconds of buyer review, starting at delivery |
| `feeBps` | uint16 | protocol fee the offer advertises (≤ 10%) — **snapshotted per deal** at fund |
| `specHash` | bytes32 | commitment to the off-chain spec |
| `nonce` | uint256 | seller nonce — revocable pre-fund via `cancelOffer(nonce)` |
| `sigDeadline` | uint64 | timestamp after which the signature can no longer be funded |

**`dealId` IS the offer's EIP-712 digest** (domain `AgentEscrow`/`1`, bound to chainId + contract address). Funding the same offer twice reverts with `DealExists` — replay protection keys on the digest, not the signature. Signature checks go through `SignatureChecker.isValidSignatureNow`, so **ERC-1271 smart-contract sellers are supported** alongside EOAs.

## Function reference

**Lifecycle** — `fund`, `markDelivered`, `confirm`, `claimTimeout`, `refundExpired`, `dispute`, `resolve(sellerBps)`, `resolveExpired` (see the state table above).

**Money out** — `withdraw()`: every settlement credits `credits[account]`; parties pull at their leisure. Pull-payments mean a reverting or token-blocklisted party can never brick a counterparty's settlement.

**Offer management** — `cancelOffer(nonce)` invalidates an unfunded signed offer; `hashOffer(offer)` returns the digest (= future dealId); `getDeal(dealId)`, `domainSeparator()` and public getters (`usdc`, `feeBps`, `arbFeeBps`, `resolveTimeout`, `treasury`, `credits(addr)`, `cancelledNonce(seller, nonce)`) round out the read surface.

**Owner (Ownable2Step)** — exactly two powers: `setTreasury(address)` and `setFeeBps(≤ 1000)`. Fee changes never touch live deals (each deal froze its `feeBps` at fund). The owner cannot pause, upgrade, seize, or influence any resolution.

## Constants & deploy parameters

| Constant | Value |
|---|---|
| `MAX_FEE_BPS` | 1 000 (10%) — hard cap on the protocol fee |
| `MAX_ARB_FEE_BPS` | 5 000 (50%) — cap on the arbitration fee taken from the losing bond |
| `resolveTimeout` | immutable per deployment, `0 < t ≤ 365 days` (runbook default: 7 days) |
| Deploy defaults | `FEE_BPS=100` (1%), `ARB_FEE_BPS=2000` (20%), treasury → deployer unless set |

Deploy scripts guard the network (`require(block.chainid == 46630)` for the Robinhood Chain testnet, `4663` for mainnet) and take the settlement token from the environment — `USDG_ADDRESS` points at an existing token deployment, or `USE_MOCK_USDC=true` deploys a freely-mintable `MockUSDC` (testnet liquidity for the arena bots). On mainnet (`4663`) the script refuses the mock fallback: `USDG_ADDRESS` is mandatory.

## Errors & events

Custom errors make every revert legible: `WrongState`, `NotBuyer` / `NotSeller` / `NotArbiter` / `NotDesignatedBuyer`, `DealExists`, `BadSignature`, `OfferExpired`, `NonceCancelled`, `InvalidDeadline` / `DeadlinePassed` / `DeadlineNotReached`, `WindowNotElapsed` / `WindowElapsed`, `InvalidBps`, `FeeTooHigh` / `ArbFeeTooHigh`, `TokenMismatch`, `ZeroAddress`, `NothingToWithdraw`. The SDK and the cockpit decode all of them into human sentences.

Every transition emits an indexed event — `DealFunded`, `Delivered`, `Confirmed`, `TimedOut`, `Refunded`, `Disputed`, `Resolved(arbiter, sellerBps, …)` (with `arbiter = address(0)` marking a `resolveExpired` fallback), `Withdrawn`, `OfferCancelled` — which is exactly what the Hub's indexer consumes.

## Auxiliary contracts (opt-in, never on the core path)

- **`SubscriptionEscrow`** — Tier-3 recurring "rent" (prepaid periods, per-period optimistic claim/dispute, own EIP-712 domain `AgentSubscription`/`1`). Self-declared **DRAFT**: it must clear its own external audit before holding real funds.
- **`StakingVault`** — standing slashable collateral. Only the arbiter of a currently-disputed deal can slash a party, capped at `slashCapBps` (≤ 50%), single-shot per deal, proceeds to the treasury (never the caller). Unstaking queues behind a `withdrawalDelay` enforced `> resolveTimeout`.
- **`YieldVault`** — share-accounted vault for an agent's **own** idle settlement token. Structurally unable to touch escrow funds (it holds no reference to any Escrow); pause blocks deposits only — exits always stay open.

## Test suite

164 Foundry tests across 14 suites: unit + negative tests, fuzzed conservation on `resolve`, reentrancy suites (against a malicious token that is also the treasury), ERC-1271 and cross-chain-replay signature tests, and 17 invariants (owner-cannot-move-funds, conservation, vault solvency under lossy sources). Fork tests replay the happy and dispute paths against a real USDC token when `FORK_RPC_URL` + `FORK_USDC_ADDRESS` are provided (pending a canonical USDC on Robinhood Chain).
