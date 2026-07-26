/**
 * Full dry-run pipeline — gate + parse + optional signer check + intent JSON.
 * LIVE is hard-blocked until settle ships. No SpacetimeDB. No private keys in output.
 */

import { checkJtxGate } from "./jtx-gate.js";
import { parseMoneyLink, type MoneyLinkResolve } from "./x-money-link.js";
import { signerSnapshot } from "./signer.js";
import type {
  DryRunRequest,
  IntentMode,
  PayoutAsset,
  PayoutIntent,
} from "./intent.js";

export type RunDryRunOptions = DryRunRequest & {
  /** Skip Solana RPC (unit tests) */
  skipGate?: boolean;
  /** Inject gate result when skipGate */
  mockGate?: { ok: boolean; uiAmount: number; message: string };
  keypairPath?: string;
  rpcUrl?: string;
};

function resolveWallet(
  req: RunDryRunOptions,
  signerPubkey: string | null,
): string {
  return (
    req.wallet?.trim() ||
    process.env.SOLANA_WALLET?.trim() ||
    process.env.XWEALTH_WALLET?.trim() ||
    signerPubkey ||
    ""
  );
}

/**
 * Execute a real dry-run (or reject LIVE).
 * Always returns JSON-serializable intent; never includes secrets.
 */
export async function runDryRun(req: RunDryRunOptions): Promise<PayoutIntent> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const mode: IntentMode = req.mode === "LIVE" ? "LIVE" : "dry-run";
  const amount = Number(req.amount);
  const asset: PayoutAsset = req.asset || "USDC";
  const method = req.method || "paste";

  if (!Number.isFinite(amount) || amount <= 0) {
    blockers.push("amount must be a positive number");
  }

  const link: MoneyLinkResolve = parseMoneyLink(req.to, method);
  if (!link.ok || !link.handle) {
    blockers.push(link.note || "invalid X Money recipient / link");
  }

  const signer = signerSnapshot(req.keypairPath);
  const wallet = resolveWallet(req, signer.pubkey);
  if (!wallet) {
    blockers.push(
      "no wallet pubkey — set SOLANA_WALLET or XWEALTH_KEYPAIR (pubkey derived)",
    );
  }

  let signerMatchesWallet: boolean | null = null;
  if (signer.present && signer.pubkey && wallet) {
    signerMatchesWallet = signer.pubkey === wallet;
    if (!signerMatchesWallet) {
      // Warning only for dry-run — does not fail the run
      warnings.push(
        `signer pubkey ${signer.pubkey.slice(0, 8)}… ≠ wallet ${wallet.slice(0, 8)}… (ok for dry-run; LIVE needs matching key)`,
      );
    }
  } else if (!signer.present) {
    warnings.push(
      signer.error ||
        "no local keypair — dry-run ok; set XWEALTH_KEYPAIR for signer check",
    );
  }

  // LIVE hard stop (exact mode only)
  if (mode === "LIVE") {
    if (req.liveConfirm !== "LIVE") {
      blockers.push('LIVE mode requires liveConfirm: "LIVE" (exact) — refusing');
    }
    blockers.push(
      "LIVE settle not shipped — USDC→X Money bridge missing (SHIP.md)",
    );
    if (signerMatchesWallet === false) {
      blockers.push("LIVE requires signer pubkey to match SOLANA_WALLET");
    }
    if (!signer.present) {
      blockers.push("LIVE requires XWEALTH_KEYPAIR local keypair file");
    }
  }

  let jtxOk = false;
  let jtxUi: number | null = null;
  let jtxMsg = "gate skipped";

  if (req.skipGate && req.mockGate) {
    jtxOk = req.mockGate.ok;
    jtxUi = req.mockGate.uiAmount;
    jtxMsg = req.mockGate.message;
    if (!jtxOk) blockers.push(jtxMsg);
  } else if (wallet) {
    try {
      const gate = await checkJtxGate(wallet, { rpcUrl: req.rpcUrl });
      jtxOk = gate.ok;
      jtxUi = gate.uiAmount;
      jtxMsg = gate.message;
      if (!gate.ok) blockers.push(gate.message);
    } catch (e) {
      jtxMsg = e instanceof Error ? e.message : String(e);
      blockers.push(`JTX gate RPC error: ${jtxMsg}`);
    }
  }

  const ok =
    blockers.length === 0 &&
    link.ok &&
    jtxOk &&
    mode === "dry-run" &&
    amount > 0;

  const note = ok
    ? warnings.length
      ? `DRY-RUN OK — no funds moved. Warnings: ${warnings.join("; ")}`
      : "DRY-RUN OK — intent complete; no USDC moved; no X Money settle; no SpacetimeDB"
    : mode === "LIVE"
      ? "LIVE blocked — settle not shipped; use mode dry-run"
      : `Dry-run incomplete — ${blockers.join("; ")}`;

  return {
    ok,
    mode,
    live: false,
    settle: false,
    wouldSettle: false,
    handle: link.handle,
    transferUrl: link.transferUrl,
    kind: link.kind,
    method: link.method,
    amount: Number.isFinite(amount) ? amount : 0,
    asset,
    fromWallet: wallet || null,
    signerPresent: signer.present,
    signerMatchesWallet,
    jtxGate: {
      ok: jtxOk,
      uiAmount: jtxUi,
      message: jtxMsg,
    },
    ts: new Date().toISOString(),
    note,
    blockers,
    warnings,
  };
}
