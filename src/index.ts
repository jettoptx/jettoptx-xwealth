/**
 * @jettoptx/xwealth
 * Agentic X Money + Solana wallet plugin for OPTX agent harnesses.
 *
 * Auth: Jett Optics X OAuth app (optional identity) + Solana wallet + JTX ≥1 gate.
 * No Privy. No SpacetimeDB required for gate / link parse / dry-run.
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
import {
  parseMoneyLink,
  buildDryRunIntent,
  type MoneyLinkResolve,
} from "./x-money-link.js";
import { createPayoutNode as createPayoutNodeDef } from "./nodes/payout.js";

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

export {
  parseMoneyLink,
  buildDryRunIntent,
  type MoneyLinkResolve,
  type MoneyLinkKind,
} from "./x-money-link.js";

export { createPayoutNode as createPayoutNodeFactory } from "./nodes/payout.js";

export { runDryRun, type RunDryRunOptions } from "./dry-run.js";
export { signerSnapshot, inspectSigner, type SignerPublicInfo } from "./signer.js";
export type {
  PayoutIntent,
  DryRunRequest,
  IntentMode,
  PayoutAsset,
} from "./intent.js";

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

  /** Parse X Money pay/transfer URL or bare handle (no network). */
    parseLink(raw: string, method: MoneyLinkResolve["method"] = "paste") {
      return parseMoneyLink(raw, method);
    }

    /**
     * Full dry-run pipeline (gate + link + optional local signer check).
     * LIVE is hard-blocked. Never returns secrets.
     */
    async dryRun(req: {
      to: string;
      amount: number;
      asset?: import("./intent.js").PayoutAsset;
      mode?: import("./intent.js").IntentMode;
      liveConfirm?: string;
      keypairPath?: string;
      wallet?: string;
    }) {
      const { runDryRun } = await import("./dry-run.js");
      return runDryRun({
        ...req,
        wallet:
          req.wallet?.trim() ||
          this.walletSession?.wallet ||
          process.env.SOLANA_WALLET ||
          process.env.XWEALTH_WALLET,
        rpcUrl: this.config.rpcUrl,
      });
    }

    /** Create a graph-compatible payout node (dry-run until LIVE). */
    createPayoutNode(opts: {
    recipientHandle: string;
    amount: number;
    currency?: string;
    transferLink?: string;
  }) {
    const link = parseMoneyLink(
      opts.transferLink || opts.recipientHandle,
      opts.transferLink ? "paste" : "unknown",
    );
    const node = createPayoutNodeDef({
      recipientHandle: opts.recipientHandle,
      amount: opts.amount,
      currency: (opts.currency as "USDC") || "USDC",
      transferLink: opts.transferLink || link.transferUrl || undefined,
    });
    return {
      id: "xwealth-payout",
      type: "payout",
      input: opts,
      link,
      execute: async () => {
        const ready = await this.assertReady();
        if (!ready.ready) {
          throw new Error(`X Wealth locked: ${ready.message}`);
        }
        const body = await node.execute({
          amount: opts.amount,
          recipientHandle: opts.recipientHandle,
        });
        return {
          ...body,
          mode: "dry-run",
          wallet: ready.wallet?.wallet,
          jtxUiAmount: ready.jtxUiAmount,
          intent: buildDryRunIntent(link, {
            amountUsd: opts.amount,
            fromWallet: ready.wallet?.wallet,
          }),
          note: "LIVE send requires explicit operator LIVE + local signer — SpacetimeDB not required",
        };
      },
    };
  }
}

export default XWealthPlugin;
