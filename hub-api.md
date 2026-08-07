# Hub API

The Hub is a Fastify JSON API mounted at the root (no `/v1`). It is **untrusted by design**: it re-verifies every signature, re-derives every hash, holds no keys and no funds. Errors follow Fastify's `{statusCode, error, message}`; 5xx messages are masked to `"internal error"`.

**Base URLs**: `http://localhost:8787` locally, `https://api.<domain>` in production.

## Modes matter

`GET /health` tells you which Hub you are talking to:

```json
{ "ok": true, "ai": false, "mode": "onchain", "simulated": false }
```

- In **simulated** mode the Hub owns a demo ledger — lifecycle POSTs mutate it.
- In **on-chain** mode the Hub is a read-only indexer + content relay. These endpoints return **`501 OnChainMode`** (sign with your wallet or the SDK instead): `POST /accept`, `/delivery`, `/confirm`, `/dispute`, `/claim-timeout`, `/refund-expired`, `/withdraw`.

## Read endpoints

| Endpoint | Returns |
|---|---|
| `GET /health` | liveness + mode flags (the only rate-limit-exempt route) |
| `GET /system/status` | `{chainId, escrow, usdc, head, lastIndexedBlock, lagBlocks, simulated}` — live RPC head in chain mode |
| `GET /deals?state=&party=` | `DealView[]` |
| `GET /deals/:id` | one `DealView` (400 malformed id, 404 unknown) |
| `GET /offers?seller=&open=true` | `OfferView[]` — chain mode annotates funded offers with `accepted: true, dealId` |
| `GET /offers/:hash` | one `OfferView` |
| `GET /disputes` | `DealView[]` currently `Disputed` |
| `GET /credits/:address` | `{address, amount}` — pull-payment balance (chain truth in chain mode) |
| `GET /reputation/:address` | derived reputation (always on — pure function of deal history) |
| `GET /staking/:address` · `/yield/:address` · `/subscriptions/:address` | positions; `enabled: false` until the matching contract is configured |
| `GET /arena` | live bot feed — chain mode + `ARENA_AGENTS` configured, else 404 |

### The `DealView` shape

One JSON object merges **chain truth** with **relayed content** — and the merge is honest about which is which:

- From the chain (or the simulated ledger): `dealId`, `buyer`, `seller`, `arbiter`, `price`, `buyerBond`, `sellerBond` (base-6 strings), `feeBps`, `deliverDeadline`, `confirmWindow`, `deliveredAt?`, `disputedAt?`, `deliveryHash?`, `onchainState` (`"None" | "Funded" | "Delivered" | "Disputed" | "Resolved"`), `sellerBps?`.
- From the relay store, attached **only if the chain confirms the underlying event happened**: `specHash?`, `delivery? {payloadHash, payloadRef, blobStored}`, `dispute? {reason, evidenceRef, status, aiAssessment?, hasArbiterKey, …}`, `buyerEncPubKey?`, `attestationUid?`.

An `OfferView` is `{offerHash, offer, signature, createdAt, accepted?, dealId?}`.

## Write endpoints (both modes)

**`POST /offers`** — relay a seller-signed offer to the book. The Hub re-derives the hash and re-verifies the EIP-712 signature (EOA recovery, with ERC-1271 fallback in chain mode). Idempotent; `201 {offerHash}`. With `STRICT_SIGNATURES` (the chain-mode default) an invalid signature is a `401`.

**`POST /relay/dispute`** — off-chain dispute content `{dealId, reason (≤4096), evidenceRef?, arbiterWrappedKey?}`. Only accepted if the deal is **`Disputed` on-chain** (409 otherwise) and **first-write-wins** (409 on a duplicate) — the relay can carry content, never overwrite it.

**`POST /relay/delivery`** — off-chain deliverable `{dealId, payloadHash, payloadRef, blobBase64? (≤ ~1.4 MB)}`. Only accepted once the deal is delivered, and the relayed `payloadHash` must match the on-chain `deliveryHash` commitment. First-write-wins.

## Arbiter endpoints

**`POST /arbiter/triage/:id`** — runs the [advisory AI triage](/dispute-and-ai-triage) on a disputed deal and returns the structured `AiAssessment`. Never mutates anything.

**`POST /arbiter/resolve`** `{dealId, sellerBps}` — in chain mode this **returns calldata only**: `{to, data, simulated: false}` for the arbiter's own wallet to sign and send (403 if the caller-declared arbiter mismatches, 409 if not disputed). The Hub never sends a transaction. In simulated mode it also drives the demo ledger and returns a `resolveTxHash`.

## x402 — `POST /x402/quote`

Machine-to-machine quoting: `{spec | specHash, buyer?, priceUsdc?, tier?}` → **HTTP 402** with a `www-authenticate: x402 …` header and an `X402Quote` body:

```json
{
  "x402Version": 1,
  "accepts": [{ "scheme": "exact", "network": "…", "maxAmountRequired": "1000000",
                "asset": "0xToken…", "payTo": "0xEscrow…", "resource": "…" }],
  "offer": { /* the 13-field Offer */ },
  "signature": "0x…",
  "chainId": 46630,
  "escrow": "0xEscrow…"
}
```

- **Simulated demo**: the Hub signs with a throwaway demo-seller key (explicitly armed via `DEMO_SELLER`/`SIMULATED`, never in chain mode).
- **Chain mode**: the quote is **TERMS-only** (`signature: "0x"`) — a real seller signs via the [SDK](/agent-sdk)'s `serveQuote`. The buyer's `quoteAndFund` guards (arbiter pinning, window floors, spend ceilings) apply regardless of who served the quote.

## Operational surface

- **Rate limit**: `RATE_LIMIT_MAX` (default 600/min) per IP; behind a proxy set `TRUST_PROXY` so the limit keys on the forwarded client IP.
- **CORS**: `CORS_ORIGIN` (comma list or `*`); body limit 2 MB; helmet on (CSP off — JSON API).
- **Chain mode boot requirements**: `ARBITER_ADDRESS` and `TREASURY_ADDRESS` are **mandatory** — the Hub refuses to boot on a real chain with the world-known demo fallbacks.
- **Optional features** (EAS attestations, Farcaster auto-cast, staking gate, yield, subscriptions, arena feed) are AND-gated env flags that default **OFF** and are force-disabled under test. A half-configured feature is a harmless no-op, never a boot crash. See `backend/.env.example` for the exact variables.
