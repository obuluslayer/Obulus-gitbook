# Economics

Every deal moves exactly four sums of money: the **price**, two optional **bonds**, and the **protocol fee**. All math is integer basis-points (`BPS = 10 000`), every terminal path conserves the total to the wei, and every payout is a pull-based credit.

## The actors' stakes

| Party | Deposits | When |
|---|---|---|
| Buyer | `price + buyerBond` | at `fund` |
| Seller | `sellerBond` | at `markDelivered` |
| Treasury | — | receives `fee` on settled price |
| Arbiter | — | receives `arbFee` only on a resolved dispute |

Bonds are anti-grief skin-in-the-game: they always return to their owner on the happy path, and the **losing side of a dispute forfeits part of its bond** to pay the arbiter.

## Happy path (`confirm` or `claimTimeout`)

```
fee          = price × feeBps / 10000        (feeBps snapshotted at fund, ≤ 10%)
seller gets  = (price − fee) + sellerBond
buyer gets   = buyerBond
treasury     = fee
```

The fee is taken on the price only — **never on bonds**. Silence is acceptance: if the buyer neither confirms nor disputes within `confirmWindow`, anyone can `claimTimeout` and the seller is paid the same amounts (optimistic release).

## Dispute (`resolve(sellerBps)`)

The arbiter picks `sellerBps ∈ [0, 10000]` — the seller's share of the price:

```
sellerPrice = price × sellerBps / 10000
buyerPrice  = price − sellerPrice          (subtraction ⇒ rounding dust goes to the buyer)
fee         = sellerPrice × feeBps / 10000 (fee only on the part the seller actually earns)
```

Then the bonds, keyed on who was wrong:

| Verdict | Arbitration fee | Seller receives | Buyer receives |
|---|---|---|---|
| `sellerBps > 5000` (buyer wrong) | `arbFee = buyerBond × arbFeeBps / 10000` | `(sellerPrice − fee) + sellerBond + (buyerBond − arbFee)` | `buyerPrice` |
| `sellerBps < 5000` (seller wrong) | `arbFee = sellerBond × arbFeeBps / 10000` | `sellerPrice − fee` | `buyerPrice + buyerBond + (sellerBond − arbFee)` |
| `sellerBps = 5000` (tie / no fault) | none | `(sellerPrice − fee) + sellerBond` | `buyerPrice + buyerBond` |

The **arbiter is paid from the losing side's bond** (capped at `MAX_ARB_FEE_BPS` = 50%; runbook default 20%) — never from the price, never from the winner. The rest of the losing bond goes to the *winner*, compensating the grief.

::: tip Worked example (defaults: fee 1%, arb fee 20%)
Deal: price 1.00, buyerBond 0.10, sellerBond 0.50 — arbiter rules 60/40 for the seller (`sellerBps = 6000`):
`sellerPrice = 0.60`, `fee = 0.006`, `arbFee = 0.10 × 20% = 0.02`.
Seller: `0.594 + 0.50 + 0.08 = 1.174` · Buyer: `0.40` · Arbiter: `0.02` · Treasury: `0.006`.
Total out = 1.60 = total in. ✔
:::

## Timeout exits

- **`refundExpired`** (seller never delivered): buyer gets back `price + buyerBond`, in full. No fee, no arbFee — the protocol earns nothing on a failed deal.
- **`resolveExpired`** (arbiter went silent for `resolveTimeout`): neutral undo — buyer gets `price + buyerBond`, seller gets `sellerBond` back. No fee, no arbFee. An absent arbiter can delay a resolution, but never decide one by default.

## Conservation

On every terminal branch:

```
credits(seller) + credits(buyer) + credits(arbiter) + credits(treasury)
  == price + buyerBond + sellerBond      (exactly, dust-free)
```

This is asserted in the contract's test suite on every settlement path (fuzzed over fee grids) and enforced fail-closed in the Hub's simulated ledger. Rounding is deliberate and bounded: price dust → buyer, fee dust → seller, arbFee dust → the winning side.

## Incentive notes

- **Why bonds?** A bond-less escrow invites free disputes (buyer) and fake deliveries (seller). Bonds make the *losing* side of a dispute pay the arbitration, so honest parties trade at zero extra cost.
- **The arbiter's incentive** is to be chosen again: it earns only on disputes, from the loser, at a capped rate. It can never profit from diverting funds (impossible) nor from stalling (`resolveExpired` zeroes its fee).
- **The operator's incentive** is volume: a capped fee (≤ 10%, default 1%) on successfully settled price — nothing on refunds, nothing on bonds.
