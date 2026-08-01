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
  augments: "https://xwealth.space/augments",
  augmentsPath: "/augments",
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
  /** Full chat account (Usage / Wallet / Security / Connectors) */
  jettchatSettings: "https://www.jettoptx.chat/settings",
  jettchatSettingsWallet: "https://www.jettoptx.chat/settings?tab=Wallet",
  home: "https://jettoptics.ai",
  jtx: "https://jtx.astroknots.space",
  /** External trade venue (not owned by xwealth) */
  jtxVenue: "https://app.jtx.com",
  /** Post-login agent plugin (jettoptx/jettoptx-xwealth) */
  plugin: XWEALTH_PLUGIN.github,
  pluginInstall: XWEALTH_PLUGIN.install,
  pluginGrok: XWEALTH_PLUGIN.grokPlugin,
  /** In-app settings (account + login connections) */
  settingsPath: "/settings",
} as const;

/** Where signed-in users go after Privy / OAuth completes. */
export function postLoginHref(): string {
  return "/dojo";
}
