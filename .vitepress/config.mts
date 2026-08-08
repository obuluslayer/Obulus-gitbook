import { defineConfig } from "vitepress";

// Obulus Layer docs. Built by Cloudflare Pages (root: gitbook/, output: dist/) with the same
// watch-path mechanic as the app and the landing — a push touching gitbook/ redeploys only the docs.
export default defineConfig({
  title: "Obulus Layer",
  description:
    "Non-custodial conditional escrow for AI-agent commerce — buy, sell and rent services, settled in USDG on Robinhood Chain.",
  lang: "en-US",
  outDir: "dist",
  cleanUrls: true,
  lastUpdated: true,
  // Brand is LIGHT-only (matches the landing + AppObulus — no dark mode). Force light, drop the toggle.
  appearance: false,

  head: [["link", { rel: "icon", type: "image/png", href: "/favicon.png" }]],

  themeConfig: {
    nav: [
      { text: "Guide", link: "/architecture" },
      { text: "Protocol", link: "/smart-contract" },
      { text: "Build", link: "/agent-sdk" },
      { text: "App", link: "https://app.obuluslayer.xyz" },
      { text: "Home", link: "https://obuluslayer.xyz" },
    ],

    sidebar: [
      {
        text: "Overview",
        items: [
          { text: "What is Obulus?", link: "/" },
          { text: "Architecture", link: "/architecture" },
          { text: "Running locally", link: "/running-locally" },
        ],
      },
      {
        text: "Protocol",
        items: [
          { text: "The Escrow contract", link: "/smart-contract" },
          { text: "Economics", link: "/economics" },
          { text: "Signed messages", link: "/messages" },
          { text: "Disputes & AI triage", link: "/dispute-and-ai-triage" },
        ],
      },
      {
        text: "Build on it",
        items: [
          { text: "Agent SDK", link: "/agent-sdk" },
          { text: "Hub API", link: "/hub-api" },
        ],
      },
      {
        text: "Operate",
        items: [
          { text: "Deployment", link: "/deployment" },
          { text: "Roadmap", link: "/roadmap" },
        ],
      },
    ],

    // Icons sit at the right end of the nav bar, on every page.
    socialLinks: [
      { icon: "github", link: "https://github.com/obuluslayer?tab=repositories", ariaLabel: "Obulus on GitHub" },
      { icon: "x", link: "https://x.com/obuluslayer", ariaLabel: "Obulus on X" },
      // VitePress ships no Telegram icon — supply the mark as a custom SVG.
      {
        icon: {
          svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Telegram</title><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
        },
        link: "https://t.me/obuluslayer",
        ariaLabel: "Obulus on Telegram",
      },
    ],

    footer: {
      message: [
        '<a href="https://obuluslayer.xyz">Home</a>',
        '<a href="https://app.obuluslayer.xyz">App</a>',
        '<a href="https://github.com/obuluslayer?tab=repositories" target="_blank" rel="noreferrer">GitHub</a>',
        '<a href="https://x.com/obuluslayer" target="_blank" rel="noreferrer">X</a>',
        '<a href="https://t.me/obuluslayer" target="_blank" rel="noreferrer">Telegram</a>',
      ].join(" · ") + "<br>MIT licensed. The chain is the source of truth.",
      copyright: "© 2026 Obulus Layer",
    },

    search: { provider: "local" },
    outline: { level: [2, 3] },
  },
});
