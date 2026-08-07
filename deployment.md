# Deployment

How the pieces reach the public internet. Full step-by-step runbooks live in the main repository — `TESTNET.md` (contracts + Hub) and `PRODUCTION.md` (Cloudflare go-live) — this page is the map.

## Target topology

| URL | What | Where |
|---|---|---|
| `https://<domain>` | Landing (`landingpageObulus/`) | Cloudflare Pages |
| `https://app.<domain>` | Cockpit (`AppObulus/`) | Cloudflare Pages |
| `https://docs.<domain>` | This site (`gitbook/`) | Cloudflare Pages |
| `https://api.<domain>` | Hub (Fastify) | VPS · nginx · Cloudflare proxy |

## The fronts — one Pages project per folder

Each static site is its own git-connected Cloudflare Pages project with a **build watch path**, so a push only redeploys the folder it touched:

| Setting | landing | app | docs |
|---|---|---|---|
| Root directory | `landingpageObulus` | `AppObulus` | `gitbook` |
| Build | `npm ci && npm run build` | idem | idem |
| Output | `dist` | `dist` | `dist` |
| Watch path | `landingpageObulus/*` | `AppObulus/*` | `gitbook/*` |

The app reads its chain identity at build time (`VITE_API_URL`, `VITE_CHAIN_ID`, `VITE_ESCROW_ADDRESS`, `VITE_USDC_ADDRESS`, `VITE_RPC_URL`); a malformed or missing value renders a clear **configuration-error screen**, never a blank page. The landing's CTAs are env-driven (`VITE_APP_URL`, `VITE_DOCS_URL`, `VITE_SECURITY_URL`).

## The contract — deliberate, guarded, verified

```bash
forge script script/DeployRobinhoodTestnet.s.sol --rpc-url robinhood_testnet --broadcast \
  --verify --verifier blockscout --verifier-url https://explorer.testnet.chain.robinhood.com/api
```

- Robinhood Chain is an Arbitrum (Nitro) L2 with gas in ETH. Testnet: chain 46630, RPC `https://rpc.testnet.chain.robinhood.com`, explorer `https://explorer.testnet.chain.robinhood.com`, ETH faucet `https://faucet.testnet.chain.robinhood.com`. Mainnet: chain 4663, RPC `https://rpc.mainnet.chain.robinhood.com`, explorer `https://robinhoodchain.blockscout.com`.
- Network guards: `require(block.chainid == 46630)` (testnet) / `4663` (mainnet — expects a hardware/multisig owner + treasury).
- USDC comes from the environment: `USDC_ADDRESS` points at an existing token, or `USE_MOCK_USDC=true` deploys a freely-mintable `MockUSDC` (testnet bot liquidity). On mainnet (`4663`) the script refuses the mock fallback — `USDC_ADDRESS` is mandatory.
- The script writes `contracts/deployments/<chainId>.json`; `scripts/testnet-env.mts` then fans the addresses out to the Hub (`deployments.json`) and the cockpit (`AppObulus/.env.local`) — no manual copying, no drift.
- Contracts are immutable: a bad parameter means a **new address**, never a migration.

## The Hub — VPS, systemd, origin-locked nginx

- Unit `obulus-hub` (`agents/deploy/obulus-hub.service`): non-root user, `Restart=on-failure`, `NoNewPrivileges`, reads `/opt/obulus/backend/.env`.
- Chain mode **requires** `ARBITER_ADDRESS` + `TREASURY_ADDRESS` (boot refuses demo fallbacks on a real chain) and flips `STRICT_SIGNATURES=true`.
- Behind the proxy: `TRUST_PROXY=1` so the per-IP rate limit keys on the real client IP; `CORS_ORIGIN` lists the exact front origins.
- nginx (`agents/deploy/nginx/`): Cloudflare origin certificate, per-IP `limit_req`, real-IP restoration from `CF-Connecting-IP`, and a **`$cf_edge` gate that 403s any direct-to-origin connection** that didn't come through Cloudflare — plus HSTS and `nosniff`.
- Health: `curl https://api.<domain>/health` → `"mode":"onchain"`.

## The arena bots (optional but great)

`arena-agents.service` runs the seller/buyer/arbiter bots against the deployed contract — a continuous public proof that the full lifecycle works. Keys are generated on the server (`npm run keygen -w agents`, chmod 600) and are **never** the well-known dev keys: the bots refuse those on any non-local RPC.

## CI is the gate

Every push runs four parallel jobs — backend/SDK/agents tests, the full Foundry suite (fuzz + invariants), both front builds, and the **wallet e2e** (anvil + deployed contract + Hub in chain mode + Playwright driving the real cockpit). Nothing reaches `main` broken without telling on itself.

## Rollback

- **Pages**: dashboard → previous deployment, one click.
- **Hub**: restore `.env.bak`, remove `deployments.json` (back to simulated), `systemctl restart obulus-hub`.
- **Contract**: deploy a new address and re-run `testnet-env.mts` — immutability cuts both ways.
