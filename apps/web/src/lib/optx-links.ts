/**
 * X Wealth product surface links (public shell = jettoptx/xwealth → xwealth.space)
 *
 * Architecture:
 *   OUTSIDE (this web app): landing, login, /augments map, pay console
 *   INSIDE  (post-login option): agent plugin jettoptx/jettoptx-xwealth
 *            (skills, dry-run CLI, JTX gate, Grok/Hermes harness — no Privy)
 *
 * MDX prototype docs: https://www.jettoptx.dev/docs
 */

/** Live MDX docs host (old OPTX prototype documentation) */
export const OPTX_DOCS = "https://www.jettoptx.dev/docs" as const;

/** Canonical agent plugin repo (post-login / harness option) */
export const XWEALTH_PLUGIN = {
  github: "https://github.com/jettoptx/jettoptx-xwealth",
  install: "https://github.com/jettoptx/jettoptx-xwealth#quick-start--clone-and-gate",
  grokPlugin: "https://github.com/jettoptx/jettoptx-xwealth/blob/main/GROK-PLUGIN.md",
  demo: "https://github.com/jettoptx/jettoptx-xwealth/blob/main/DEMO.md",
} as const;

export const OPTX_LINKS = {
  /** Canonical public product host */
  wealth: "https://xwealth.space",
  moa: "https://xwealth.space/moa",
  moaDocs: `${OPTX_DOCS}/dojo/moa`,
  /** Full Augments tab (ops + marketplace) — top-level shell route */
  augments: "https://xwealth.space/augments",
  augmentsPath: "/augments",
  /** Pay Links — sub-page of Augments (directory / send / lookup) */
  paylinks: "https://xwealth.space/paylinks",
  paylinksPath: "/paylinks",
  moaPath: "/moa",
  consolePath: "/console",
  x402Pay: "https://xwealth.space/api/x402/pay",
  aaronX402: "https://aaron.jettoptics.ai/x402",
  jtxX402: "https://jtx.astroknots.space/x402",
  /**
   * DOJO — operator hub (in-app). Points at WARP graph + MDX docs.
   */
  dojo: "https://xwealth.space/dojo",
  dojoPath: "/dojo",
  dojoMoa: `${OPTX_DOCS}/dojo/moa`,
  /**
   * WARP — interactive nodes graph (WealthMoaBuilder from xwealth-ui).
   * Same-origin so session stays; full-screen MOA force graph.
   */
  warp: "https://xwealth.space/warp",
  warpPath: "/warp",
  docs: OPTX_DOCS,
  docsRoot: OPTX_DOCS,
  jettchat: "https://www.jettoptx.chat/",
  /**
   * Canonical chat = Block Buzz Desktop (Augment community relay).
   * jettoptx.chat/send is EMO QR / bot portal only — not the Buzz inbox.
   * x402 notify still bridges via JOE_BUZZ_WEBHOOK_URL → JettChat STDB until
   * a Buzz-native publish path is wired; Open Buzz always goes to the app.
   */
  buzzRelayUrl: "wss://augment.communities.buzz.xyz",
  /** Opens Buzz Desktop and connects to the Augment community relay. */
  buzzChannel: "buzz://connect?relay=wss://augment.communities.buzz.xyz",
  /** Web fallback (download / manage communities) when deep link unavailable. */
  buzzChannelWeb: "https://buzz.xyz",
  buzzChannelLabel: "Buzz · Augment",
  /** Full chat account (Usage / Wallet / Security / Connectors) on jettoptx.chat */
  jettchatSettings: "https://www.jettoptx.chat/settings",
  jettchatSettingsWallet: "https://www.jettoptx.chat/settings?tab=Wallet",
  home: "https://jettoptics.ai",
  jtx: "https://jtx.astroknots.space",
  /** Buy ≥1 JTX — product SKU gate (wallet balance, not SaaS key) */
  jtxBuy: "https://astroknots.space/buy",
  /** External trade venue (not owned by xwealth) */
  jtxVenue: "https://app.jtx.com",
  /** Post-login agent plugin (jettoptx/jettoptx-xwealth) */
  plugin: XWEALTH_PLUGIN.github,
  pluginInstall: XWEALTH_PLUGIN.install,
  pluginGrok: XWEALTH_PLUGIN.grokPlugin,
  /** In-app settings (account + login connections) */
  settingsPath: "/settings",
  /**
   * Cloudflare Wallets agent identity (claim / Monetization Gateway rail).
   * Not a Solana USDC settle destination today — LIVE settle = JOE/harness sign + X Money.
   */
  cloudflareWallet: "https://augment.cloudflare.pay",
  cloudflareWalletHandle: "augment.cloudflare.pay",
  cloudflareWalletsBlog: "https://blog.cloudflare.com/wallets/",
} as const;

/** Where signed-in users go after Privy / OAuth completes. */
export function postLoginHref(): string {
  return "/dojo";
}
