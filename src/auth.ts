/**
 * X Wealth auth model (no Privy):
 *
 * 1) Optional X OAuth via **Jett Optical Encryption** developer app
 *    (console.x.com app 32724640) — identity: X user id / handle.
 * 2) Required Solana wallet pubkey (user-supplied or agent config).
 * 3) Required JTX v2 gate: wallet holds ≥ 1 JTX.
 *
 * Privy is not used. X OAuth does not produce a Solana key;
 * wallet is always separate.
 */

export /** Public OAuth 2.0 Client ID — Jett Optical Encryption (app 32724640) */
const JETT_OPTICS_X_CLIENT_ID =
  process.env.X_CLIENT_ID ||
  process.env.XWEALTH_X_CLIENT_ID ||
  "TFhKZW9KTmVxM3loTzd5ZEViVEU6MTpjaQ";

export const XWEALTH_OAUTH_SCOPES =
  process.env.XWEALTH_OAUTH_SCOPES ||
  "tweet.read users.read offline.access bookmark.read";

/** Default loopback for CLI / local plugin OAuth (must be registered on the X app). */
export const XWEALTH_OAUTH_REDIRECT =
  process.env.XWEALTH_OAUTH_REDIRECT || "http://127.0.0.1:8787/callback";

export interface XSession {
  xUserId?: string;
  xHandle?: string;
  accessToken?: string;
  /** Never log secrets in agent chat. */
  hasRefreshToken?: boolean;
}

export interface WalletSession {
  wallet: string;
  source: string;
}

export interface PluginAuthState {
  x?: XSession;
  wallet?: WalletSession;
  jtxPass: boolean;
  jtxUiAmount?: number;
  ready: boolean;
  message: string;
}

export function authSummary(state: PluginAuthState): string {
  const parts = [
    state.x?.xHandle ? `X=@${state.x.xHandle.replace(/^@/, "")}` : "X=optional",
    state.wallet ? `wallet=${state.wallet.wallet.slice(0, 8)}…` : "wallet=missing",
    state.jtxPass ? "JTX=pass" : "JTX=fail",
    state.ready ? "plugin=ready" : "plugin=locked",
  ];
  return parts.join(" | ");
}

export { JETT_OPTICS_X_CLIENT_ID as X_CLIENT_ID_PUBLIC };
