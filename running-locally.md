# Running locally

Everything runs on **Node ≥ 20**; the contracts need [Foundry](https://book.getfoundry.sh/) (`forge`, `anvil`, `cast`). No Postgres, no Docker.

## The 30-second demo (simulated mode)

```bash
# 1) the Hub — zero external services: in-memory, seeded, simulated settlement
cd backend && npm install && npm run dev        # → http://localhost:8787

# 2) the cockpit (talks to the Hub — VITE_API_URL overrides the default localhost:8787)
cd ../AppObulus && npm install && npm run dev   # → http://localhost:5173
```

The Hub boots in **simulated** mode: a seeded in-memory store with exact-conservation settlement. The cockpit is fully interactive with no chain and no wallet — ideal for a first look.

## On-chain mode (real contract on a local chain)

The legitimate dev/staging setup: real EIP-712 signatures, real USDC movement, real conservation — no real funds.

```bash
anvil --chain-id 31337 --silent &      # local chain (never masquerade as a public chain id)
(cd contracts && forge build)            # compile Escrow + MockUSDC
npx tsx scripts/dev-chain.mts          # deploy + fund 8 demo wallets → writes deployments.json
                                       #   + AppObulus/.env.development.local (no manual sync)
npx tsx scripts/onchain-e2e.mts        # PROOF: fund→deliver→confirm + dispute→resolve, conservation asserted
cd backend && npm run dev              # Hub auto-detects deployments.json → ON-CHAIN mode
cd ../AppObulus && npm run dev         # cockpit signs everything via the injected wallet
```

`dev-chain.mts` refuses to run against anything that isn't an anvil/hardhat node (`web3_clientVersion` guard), so it can never accidentally deploy a MockUSDC escrow to a public network. In on-chain mode the Hub's write endpoints return `501` — every state change is signed client-side.

Check the mode any time:

```bash
curl -s localhost:8787/health   # → {"ok":true, "mode":"onchain", ...}
```

## Run the autonomous arena

Three bots (seller, buyer, arbiter) drive real deals through the SDK — happy path, dispute, timeout-refund:

```bash
RUN_ONCE=1 npm run once -w agents      # one full pass, then exit (great smoke test)
npm run start -w agents                # continuous loop (PACE_MS between deals)
```

On a local anvil the bots fall back to well-known dev keys; against any non-local RPC they **refuse** to start without your own keys (`npm run keygen -w agents`). Useful knobs: `PRICE_USD`, `PACE_MS`, `TIMEOUT_WINDOW_S`, `ANTHROPIC_API_KEY` (deliverables written by a real LLM).

## Test suites

```bash
(cd contracts && forge test)       # 164 tests — unit, fuzz, invariants, reentrancy, fork
npm run test -w backend          # 212 tests — API, state machine, settlement, features
npm run test -w sdk              # 39 tests — EIP-712 parity, x402 guards, timeouts
npm run test -w agents           # hermetic rent-scenario tests
```

### The wallet e2e (the strongest proof)

A headless EIP-6963 wallet drives the real cockpit against the real contract — connect, fund, deliver, confirm, dispute, resolve:

```bash
anvil --port 8545 --chain-id 31337 --silent &
npx tsx scripts/dev-chain.mts
ARBITER_ADDRESS=0x1efF47bc3a10a45D4B230B5d10E37751FE6AA718 \
TREASURY_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 npm run dev -w backend &
cd AppObulus && npx playwright test    # vite is started by Playwright itself
```

(Ports busy? `anvil --port 8555` + `E2E_RPC_URL=http://127.0.0.1:8555` — `dev-chain.mts` follows `RPC_URL`.) The same stack runs in CI on every push.

## Back to zero

```bash
rm deployments.json AppObulus/.env.development.local   # → Hub simulated, cockpit local defaults
```
