/**
 * DEPRECATED — X Wealth no longer uses Privy.
 *
 * Use:
 *   - examples/x-oauth-jtx.ts  (plugin auth)
 *   - npm run setup            (wallet + JTX ≥1 gate)
 *
 * Identity: Jett Optical Encryption X OAuth app (console.x.com app 32724640)
 * Gate: Solana wallet holds ≥ 1 JTX v2 (scripts/check-jtx-gate.mjs)
 *
 * Kept as a historical stub so old links do not 404.
 */
export const PRIVY_DEPRECATED = true as const;

export function XWealthPrivyProvider(_props: { children?: unknown }) {
  throw new Error(
    "Privy is removed from X Wealth. Use SOLANA_WALLET + npm run setup (JTX ≥1). Optional X OAuth via Jett Optics X app Client ID — see examples/x-oauth-jtx.ts",
  );
}
