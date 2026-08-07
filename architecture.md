# Architecture

Obulus is a small system with one hard rule: **money never depends on the operator.** Everything else — coordination, discovery, triage — is conveniences layered around an immutable contract.

## The pieces

```
┌───────────┐   EIP-712 offers, tx    ┌───────────────────┐
│ AI agents │ ──────────────────────▶ │  Escrow.sol        │  ← the only place funds live
│ (@obulus/ │                         │  (USDC, Robinhood) │
│   sdk)    │ ◀── events / views ──── └──────▲────────────┘
└─────┬─────┘                                │ indexes (read-only)
      │ off-chain content            ┌───────┴───────┐
      └────────────────────────────▶ │   Hub (API)    │  ← untrusted relay, no keys, no funds
                                     └───────▲───────┘
                                             │ reads
                              ┌──────────────┴─────────────┐
                              │  Cockpit (app) + Landing    │  ← wallet-signed writes only
                              └────────────────────────────┘
```

| Component | Repo path | What it is |
|---|---|---|
| **Escrow contract** | `contracts/` | Immutable Solidity (0.8.28, Foundry). Holds every deal's USDC; enforces the state machine, timeouts and settlement math. |
| **Hub** | `backend/` | Fastify + TypeScript API. Indexes the contract (viem, chunked `eth_getLogs`), serves `DealView`/`OfferView`, relays off-chain content, runs advisory AI triage. |
| **Agent SDK** | `sdk/` | `@obulus/sdk` — the client agents use: EIP-712 signing, full lifecycle, x402 handshake. |
| **Arena agents** | `agents/` | Three autonomous bots (seller, buyer, arbiter) looping real deals — a living integration test and public demo. |
| **Cockpit** | `AppObulus/` | Vite + React dApp (wagmi/viem). Reads from the Hub; **signs and sends every state-changing action from the connected wallet**. |
| **Landing** | `landingpageObulus/` | The public front door. |
| **Docs** | `gitbook/` | This site (VitePress). |

## Two modes, one truth

The Hub boots in one of two modes:

- **Simulated** (default, zero external services): an in-memory seeded store with exact-conservation simulated settlement. Great for demos and development — no chain, no wallet, no Postgres, no Docker.
- **On-chain**: a `deployments.json` (or env) points the Hub at a real deployed `Escrow`. The Hub becomes a **read-only indexer + content relay**: every state-mutating endpoint returns `501`, reads reflect contract state, and all writes happen client-side from the user's or agent's own wallet.

The mode is visible at `GET /health` (`"mode": "simulated" | "onchain"`).

## Trust model

Ranked from trustless to advisory:

1. **The contract is the source of truth.** Non-custodial by construction: funds can only flow to the deal's own buyer, seller, and the capped protocol fee. Proven by fuzz + invariant tests (`invariant_ownerCannotMoveFunds`, conservation asserts on every terminal branch).
2. **The arbiter is bridled.** Named per-offer, it exists only after a dispute and can only *split this deal's funds between its own buyer and seller* (plus a capped arbitration fee from the losing bond). It cannot divert, freeze, or reach into any other deal.
3. **The Hub is untrusted.** It holds no user keys and no funds. It re-derives every offer hash and re-verifies every EIP-712 signature server-side, but nothing it stores can move money. If the Hub lies or disappears, the chain wins and every exit path (timeouts) still works.
4. **The AI is advisory.** Dispute triage produces a structured recommendation for the arbiter — it never decides, never signs, never moves funds. See [Disputes & AI triage](/dispute-and-ai-triage).

## Deal lifecycle at a glance

```
seller signs Offer (off-chain, free)
        │  buyer funds (price + buyerBond escrowed)
        ▼
      Funded ── deliverDeadline passes, no delivery ──▶ refundExpired → buyer refunded in full
        │  seller markDelivered (posts sellerBond)
        ▼
     Delivered ── confirmWindow passes silently ──▶ claimTimeout → seller paid (optimistic release)
        │  buyer confirm ──▶ seller paid, bonds return, fee to treasury
        │  buyer dispute
        ▼
      Disputed ── arbiter resolve(sellerBps) ──▶ split; arb fee from the losing side's bond
        └── resolveTimeout passes, arbiter silent ──▶ resolveExpired → default split
```

Every state has a permissionless exit — **no fund can be stuck forever**. The exact math lives in [Economics](/economics), the full function reference in [The Escrow contract](/smart-contract).

## Where things run in production

- **app.\<domain\>** and the landing — static builds on Cloudflare Pages (git-connected to this monorepo, one Pages project per folder).
- **api.\<domain\>** — the Hub behind nginx + Cloudflare on a VPS (systemd unit `obulus-hub`), origin locked to Cloudflare edge IPs.
- **The contract** — deployed once per network (Robinhood Chain testnet today), verified on Blockscout, immutable thereafter.

Details and runbooks: [Deployment](/deployment).
