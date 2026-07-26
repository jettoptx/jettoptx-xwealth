/**
 * @jettoptx/xwealth
 * Agentic X Money + Solana wallet plugin for OPTX agent harnesses.
 *
 * Auth: Jett Optics X OAuth app (optional identity) + Solana wallet + JTX ≥1 gate.
 * No Privy.
 */

import {
  checkJtxGate,
  JTX_MINT_V2,
  DEFAULT_RPC,
  type JtxGateResult,
} from "./jtx-gate.js";
import {
  JETT_OPTICS_X_CLIENT_ID,
  XWEALTH_OAUTH_REDIRECT,
  XWEALTH_OAUTH_SCOPES,
  authSummary,
  type PluginAuthState,
  type XSession,
  type WalletSession,
} from "./auth.js";

export {
  checkJtxGate,
  JTX_MINT_V2,
  DEFAULT_RPC,
  type JtxGateResult,
} from "./jtx-gate.js";

export {
  JETT_OPTICS_X_CLIENT_ID,
  XWEALTH_OAUTH_REDIRECT,
  XWEALTH_OAUTH_SCOPES,
  authSummary,
  type PluginAuthState,
  type XSession,
  type WalletSession,
} from "./auth.js";

export interface XWealthConfig {
  jtxMint?: string;
  rpcUrl?: string;
  /** Public X OAuth client id (Jett Optical Encryption app). */
  xOauthClientId?: string;
  minJtx?: number;
}

export class XWealthPlugin {
  private xSession?: XSession;
  private walletSession?: WalletSession;
  private lastGate?: JtxGateResult;

  constructor(private config: XWealthConfig = {}) {
    this.config.jtxMint ??= JTX_MINT_V2;
    this.config.rpcUrl ??= DEFAULT_RPC;
    this.config.xOauthClientId ??= JETT_OPTICS_X_CLIENT_ID;
    this.config.minJtx ??= 1;
  }

  /** Attach optional X OAuth identity (from console Generate or PKCE flow). */
  setXSession(session: XSession) {
    this.xSession = session;
  }

  /** Attach Solana wallet pubkey used for JTX gate + signing later. */
  setWallet(wallet: string, source = "manual") {
    this.walletSession = { wallet: wallet.trim(), source };
  }

  /**
   * Verify JTX v2 balance gate on a wallet.
   * Pass if uiAmount >= minJtx (default 1).
   */
  async checkJtxGate(walletAddress: string): Promise<boolean> {
    const result = await checkJtxGate(walletAddress, {
      rpcUrl: this.config.rpcUrl,
      mint: this.config.jtxMint,
      minRequired: this.config.minJtx,
    });
    this.lastGate = result;
    if (!this.walletSession) {
      this.walletSession = { wallet: walletAddress, source: "checkJtxGate" };
    }
    return result.ok;
  }

  /** Full gate result (balance, rpc, message). */
  async checkJtxGateDetailed(walletAddress: string): Promise<JtxGateResult> {
    const result = await checkJtxGate(walletAddress, {
      rpcUrl: this.config.rpcUrl,
      mint: this.config.jtxMint,
      minRequired: this.config.minJtx,
    });
    this.lastGate = result;
    return result;
  }

  /**
   * Boot check for agents: wallet configured + JTX ≥1.
   * X OAuth is optional for dry-run tools; required only for X-linked actions later.
   */
  async assertReady(walletAddress?: string): Promise<PluginAuthState> {
    const wallet =
      walletAddress?.trim() ||
      this.walletSession?.wallet ||
      process.env.SOLANA_WALLET ||
      process.env.XWEALTH_WALLET ||
      "";

    if (!wallet) {
      return {
        x: this.xSession,
        jtxPass: false,
        ready: false,
        message:
          "No Solana wallet. Set SOLANA_WALLET or call setWallet(pubkey). X OAuth alone is not enough.",
      };
    }

    this.setWallet(wallet, this.walletSession?.source || "env");
    const gate = await this.checkJtxGateDetailed(wallet);
    const state: PluginAuthState = {
      x: this.xSession,
      wallet: this.walletSession,
      jtxPass: gate.ok,
      jtxUiAmount: gate.uiAmount,
      ready: gate.ok,
      message: gate.message,
    };
    if (gate.ok) {
      state.message = `Ready — ${gate.message}`;
      if (this.xSession?.xHandle) {
        state.message += ` · X @${this.xSession.xHandle.replace(/^@/, "")}`;
      }
    }
    return state;
  }

  getAuthState(): PluginAuthState {
    return {
      x: this.xSession,
      wallet: this.walletSession,
      jtxPass: !!this.lastGate?.ok,
      jtxUiAmount: this.lastGate?.uiAmount,
      ready: !!this.lastGate?.ok && !!this.walletSession,
      message: this.lastGate?.message || "Not checked yet — call assertReady()",
    };
  }

  /** Create a graph-compatible payout node (dry-run until LIVE). */
  createPayoutNode(opts: {
    recipientHandle: string;
    amount: number;
    currency?: string;
  }) {
    return {
      id: "xwealth-payout",
      type: "payout",
      input: opts,
      execute: async () => {
        const ready = await this.assertReady();
        if (!ready.ready) {
          throw new Error(`X Wealth locked: ${ready.message}`);
        }
        // Dry-run only in scaffold
        return {
          mode: "dry-run",
          recipientHandle: opts.recipientHandle,
          amount: opts.amount,
          currency: opts.currency || "USD",
          wallet: ready.wallet?.wallet,
          jtxUiAmount: ready.jtxUiAmount,
          note: "LIVE send requires explicit operator LIVE + policy allowlist",
        };
      },
    };
  }
}

export default XWealthPlugin;
