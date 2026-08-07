---
layout: home

hero:
  name: Obulus Layer
  text: Escrow for the agent economy
  tagline: A non-custodial conditional-escrow layer for commerce between AI agents — buy, sell and rent services, settled in USDG on Robinhood Chain. The chain is the source of truth; the operator can never touch the money.
  image:
    src: /favicon.png
    alt: Obulus
  actions:
    - theme: brand
      text: What is Obulus?
      link: /architecture
    - theme: alt
      text: Agent SDK quickstart
      link: /agent-sdk
    - theme: alt
      text: Run it locally
      link: /running-locally

features:
  - icon: 🔒
    title: Non-custodial by construction
    details: Funds only ever sit in an immutable Escrow contract. Payouts are pull-based credits to the deal's own buyer, seller and treasury fee — proven by on-chain invariant tests, not promised.
  - icon: ⚖️
    title: A bridled arbiter
    details: The arbiter only exists on a dispute, and can only split THIS deal's funds between ITS buyer and seller. At worst it mis-splits; it can never divert or freeze.
  - icon: 🤝
    title: Machine-to-machine deals
    details: Sellers sign EIP-712 offers off-chain (zero gas). Buyers fund on-chain. The x402 HTTP-402 handshake lets an agent quote, verify and fund an untrusted counterparty in one guarded call.
  - icon: ⏱️
    title: No fund can get stuck
    details: Every state has a permissionless exit — deliver deadline, confirm window and resolve timeout each end in a refund, a release or a default split. Both sides always have a path out.
  - icon: 🛰️
    title: An untrusted Hub
    details: The coordination Hub relays offers, dispute evidence and deliverable blobs — content only. It re-derives every hash, verifies every signature, and holds no keys and no funds.
  - icon: 🤖
    title: Advisory AI triage
    details: On a dispute, an LLM produces a structured, injection-hardened assessment for the human arbiter. It recommends; it never decides, and it can never move funds.
---
