# Roadmap

Obulus ships in deliberate stages: **prove the mechanism → run it in public on testnet → clear the mainnet gates**. The invariants (non-custodial, bridled arbiter, untrusted relay, advisory AI) hold at every stage — what changes is how much real value they protect.

## Done — the mechanism, proven

- ✅ `Escrow.sol` with fuzzed conservation and 17 invariant suites (incl. *owner-cannot-move-funds*), reentrancy and ERC-1271 coverage — 164 Foundry tests.
- ✅ The Hub: two modes (simulated / on-chain indexer), strict signature verification, content relay bound to chain truth — 212 tests.
- ✅ `@obulus/sdk` with strict-by-default x402 guards (arbiter pinning, window floors, spend ceilings) and bounded I/O — 39 hermetic tests, publish-ready.
- ✅ The cockpit: wallet-signed everything, exact-scope approvals, decoded contract errors, config fail-safes.
- ✅ End-to-end proof on every push: CI drives a headless wallet through fund → deliver → confirm and the dispute → resolve path against a real local chain.
- ✅ The autonomous arena: three bots looping happy / dispute / timeout-refund lifecycles through the SDK.

## Now — the Robinhood Chain testnet campaign

- 🔄 Public deploy: contract on the Robinhood Chain testnet (verified), Hub at `api.<domain>`, cockpit + landing + these docs on Cloudflare Pages.
- 🔄 Arena bots running continuously in public — every deal inspectable in the app and on Blockscout.
- 🔄 Onboarding: MockUSDC faucet flow for visitors, wallet path (connect → fund → Funded) documented end-to-end.

## Next — the mainnet gates

None of these are optional, and none are hand-waved:

1. **External professional audit of `Escrow.sol`.** The internal remediation rounds (regression-tested) are table stakes, not a substitute.
2. **Durable persistence for the relay** (Postgres). Today a Hub restart loses off-chain dispute content — acceptable for a testnet demo, disqualifying for real funds. This also unlocks safely arming EAS attestations and Farcaster casts (exactly-once side-effects need durable dedup).
3. **Deploy hardening.** `DeployRobinhoodMainnet` must *require* a multisig owner + treasury on chain 4663 (the script already *refuses* `USE_MOCK_USDC` / arbitrary token overrides on mainnet — `USDC_ADDRESS` is mandatory).
4. **SDK mainnet posture**: gas-fee ceilings, ERC-1271-aware client-side verification, tightened dependency pinning, npm publication under `@obulus`.
5. **Operational maturity**: metrics, a real readiness probe, finality-aware indexing, proxy-hardened rate limiting (partially done), monitoring + alerting for the Hub and the bots.

## Later — the vision features (built, gated OFF)

Six extensions already exist behind AND-gated flags that default OFF and never arm under test. Each stays off until its infrastructure prerequisite — and the persistence milestone — is real:

| Feature | Status | Blocked on |
|---|---|---|
| x402 demo-signing | live in simulated demos | — (chain mode serves TERMS-only by design) |
| EAS settlement attestations + reputation pricing | built + tested | EAS availability on Robinhood Chain (addresses via `EAS_CONTRACT` / `EAS_SCHEMA_REGISTRY` env, to be confirmed), schema UID, funded attester, durable dedup |
| Staking / slashing (`StakingVault`) | built + invariant-tested | deployed vault, slash-coverage policy |
| Farcaster milestone Frames + auto-cast | frames live (read-only); casting gated | FID + signer, public HTTPS, durable dedup |
| ERC-4337 gasless funding | builders shipped in the SDK | an Alchemy/ZeroDev bundler URL + a funded gas policy (AA is first-class on Robinhood Chain) |
| Uniswap v4 yield routing | **inert test skeleton by design** (`isProductionReady() == false`) | a real, audited yield source — the safe 1:1 null source ships instead |
| Subscriptions (`SubscriptionEscrow`, Tier-3 rent) | built + tested, self-declared **DRAFT** | its own independent audit before holding real funds |

## Further out — verifiability tiers & hard problems

The organizing model for what a deal can *prove*:

| Tier | Verifiability | Status |
|---|---|---|
| **T1 — atomic** | payment ⇄ artifact swap, machine-checkable on-chain | future |
| **T2 — subjective / optimistic** | commitment hash + windows + human arbiter | **shipped (v0.1)** |
| **T3 — streaming / subscription** | per-period optimistic claims | built (`SubscriptionEscrow`), gated behind its own audit |

Open problems we name rather than hand-wave: **fair-exchange / threshold encryption** for sealed deliverables (v0.1 relays plaintext — the chain carries the commitment, not confidentiality); Sybil resistance beyond bonds; dispute *policy* (evidence formats, judgment SLAs, appeals); and the **regulatory posture** — an operator running a hub + commission + arbitration looks escrow/MSB-adjacent in many jurisdictions, so mainnet scale needs jurisdiction-specific counsel, not vibes.

## The standing invariants

Whatever stage we are at, these do not move:

1. Funds only ever flow to a deal's own buyer, seller, and the capped fee.
2. The arbiter can only split — never divert, never freeze, never reach other deals.
3. Every state has a permissionless exit; no fund can be stuck.
4. The Hub stays untrusted: no keys, no funds, re-verified signatures.
5. The AI recommends; it never decides and never signs.
