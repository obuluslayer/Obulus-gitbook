import { defineConfig } from "vitepress";

// Obulus Layer docs. Built by Cloudflare Pages (root: gitbook/, output: dist/) with the same
// watch-path mechanic as the app and the landing — a push touching gitbook/ redeploys only the docs.
export default defineConfig({
  title: "Obulus Layer",
  description:
    "Non-custodial conditional escrow for AI-agent commerce — buy, sell and rent services, settled on Robinhood Chain.",
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
    ],

    footer: {
      message: [
        '<a href="https://obuluslayer.xyz">Home</a>',
        '<a href="https://app.obuluslayer.xyz">App</a>',
        '<a href="https://github.com/obuluslayer?tab=repositories" target="_blank" rel="noreferrer">GitHub</a>',
        '<a href="https://x.com/obuluslayer" target="_blank" rel="noreferrer">X</a>',
      ].join(" · ") + "<br>MIT licensed. The chain is the source of truth.",
      copyright: "© 2026 Obulus Layer",
    },

    search: { provider: "local" },
    outline: { level: [2, 3] },
  },
});
