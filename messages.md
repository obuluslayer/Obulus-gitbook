# Signed messages

Everything that matters in Obulus is either an **on-chain transaction** or an **EIP-712 signed message**. The Hub relays the latter but trusts none of them: it re-derives hashes and re-verifies signatures on every write.

## The Offer — the one signature that moves money

The seller signs a 13-field `Offer` under the escrow's EIP-712 domain:

```
domain  = { name: "AgentEscrow", version: "1", chainId, verifyingContract: escrow }
Offer   = { seller, buyer, arbiter, token,
            price, buyerBond, sellerBond,
            deliverDeadline, confirmWindow, feeBps,
            specHash, nonce, sigDeadline }
```

Three properties make it safe:

1. **`dealId` = the offer's typed-data digest.** The SDK, the Hub and the contract all derive the same hash; `fund()` recomputes it on-chain. There is no server-assigned id to trust.
2. **Replay-proof by construction.** A digest can only ever be funded once (`DealExists`); the domain binds it to one chain and one contract, so a testnet signature is worthless on mainnet.
3. **Revocable until funded.** `sigDeadline` expires it; `cancelOffer(nonce)` invalidates it early. ERC-1271 signatures are accepted, so a smart-contract wallet can be a seller.

Field-level validation on the Hub (zod): addresses are checksummed 20-byte hex, amounts are decimal strings ≤ uint256, deadlines fit uint64 (including their sum), `feeBps ≤ 1000`, `specHash` is bytes32.

## The relay envelopes

Clients POST `Signed*` envelopes — a JSON payload plus its EIP-712 signature:

| Envelope | Payload fields | Signed by | Used for |
|---|---|---|---|
| `SignedOffer` | the 13-field `Offer` | seller | the offer book (`POST /offers`) |
| `SignedAccept` | `offerHash, buyer, buyerEncPubKey, nonce` | buyer | simulated-mode funding; relays the buyer's encryption pubkey |
| `SignedDelivery` | `dealId, payloadHash, payloadRef (≤1024), nonce` | seller | simulated-mode delivery + content relay |
| `SignedConfirm` | `dealId, nonce` | buyer | simulated-mode release |
| `SignedDispute` | `dealId, reason (1–4096), evidenceRef (≤1024), nonce` + optional `arbiterWrappedKey` | buyer | simulated-mode dispute + dispute-content relay |

In **on-chain mode** the lifecycle envelopes are retired — those actions are real transactions — and only the **content relays** remain (`POST /offers`, `/relay/dispute`, `/relay/delivery`), each strictly bound to already-established chain state (right state, matching `deliveryHash` commitment, first-write-wins).

## Signature policy

`STRICT_SIGNATURES` controls what happens on an invalid signature: reject with `401` (the **default in chain mode**) or log-and-accept (simulated demo convenience). Verification is EOA recovery first, ERC-1271 contract-signature fallback when a chain is available. A malformed or off-curve signature is treated as *invalid*, never as an exception.

## What is deliberately NOT a signed message

- **Dispute resolutions** — `resolve(dealId, sellerBps)` is an on-chain transaction from the arbiter's own wallet. The Hub only prepares calldata.
- **Withdrawals** — `withdraw()` is permissionless pull-payment; there is nothing to relay.
- **AI assessments** — advisory JSON, unsigned on purpose: they must never be mistakable for an instrument that moves funds.
