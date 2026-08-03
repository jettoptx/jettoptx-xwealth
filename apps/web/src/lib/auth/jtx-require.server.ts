/**
 * Server-side JTX ≥1 gate for sensitive API routes.
 *
 * Gated endpoints (call requireJtxGate):
 *   BALANCE (+ rate limit): POST /api/tinyfish/search, /api/tinyfish/enrich,
 *     /api/blockworks/search, /api/x/probe-money, /api/x/social-graph
 *   PROVEN (balance + ed25519 ownership): POST /api/x402/pay settle,
 *     /api/mojo/sign-challenge, /api/mojo/broadcast
 *
 * Wallet: header X-Solana-Wallet | X-Wallet | query/body wallet
 * Proof:  header X-JTX-Proof (base58 sig) + optional X-JTX-Message
 *
 * Buy CTA: https://astroknots.space/buy
 * Bypass (local/CI only): JTX_GATE_DISABLED=true
 */

import { JTX_MINT } from "@/lib/jtxGate";
import { solanaRpcCall } from "@/lib/helius-rpc";
import { OPTX_LINKS } from "@/lib/optx-links";
import { jtxCorsHeaders } from "@/lib/auth/jtx-cors";
import { verifyJtxOwnershipProof } from "@/lib/auth/jtx-ownership";
import { jtxRateLimitAllow } from "@/lib/auth/jtx-rate-limit";

export const JTX_WALLET_HEADER = "x-solana-wallet";
export const JTX_PROOF_HEADER = "x-jtx-proof";
export const JTX_MESSAGE_HEADER = "x-jtx-message";

export type JtxGateMode = "balance" | "proven";

export type JtxServerGateOk = {
  ok: true;
  wallet: string;
  uiAmount: number;
  mint: string;
  rpc: string;
  mode: JtxGateMode;
  proven: boolean;
};

export type JtxServerGateFail = {
  ok: false;
  response: Response;
};

type TokenAccountValue = Array<{
  account?: {
    data?: {
      parsed?: {
        info?: {
          tokenAmount?: { uiAmount: number | null; amount: string };
        };
      };
    };
  };
}>;

function gateDisabled(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env.JTX_GATE_DISABLED === "true"
  );
}

export function jtxBuyUrl(): string {
  return OPTX_LINKS.jtxBuy;
}

export function walletFromRequest(
  request: Request,
  body?: { wallet?: string; solanaWallet?: string },
): string {
  const header =
    request.headers.get(JTX_WALLET_HEADER)?.trim() ||
    request.headers.get("x-wallet")?.trim() ||
    "";
  if (header) return header;

  const url = new URL(request.url);
  const q = url.searchParams.get("wallet")?.trim();
  if (q) return q;

  const fromBody = body?.wallet?.trim() || body?.solanaWallet?.trim();
  return fromBody || "";
}

function deny(
  request: Request,
  payload: Record<string, unknown>,
  status = 402,
): Response {
  return Response.json(
    {
      ...payload,
      error: payload.error ?? "jtx_required",
      buyUrl: jtxBuyUrl(),
      mint: JTX_MINT,
      docs: "https://astroknots.space/buy",
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-JTX-Buy": jtxBuyUrl(),
        ...jtxCorsHeaders(request),
      },
    },
  );
}

/**
 * Enforce ≥1 JTX.
 * @param mode `balance` = paste pubkey + on-chain check (+ rate limit).
 *             `proven`  = balance + ed25519 ownership proof (settle/mojo).
 */
export async function requireJtxGate(
  request: Request,
  body?: { wallet?: string; solanaWallet?: string },
  opts?: { mode?: JtxGateMode },
): Promise<JtxServerGateOk | JtxServerGateFail> {
  const mode: JtxGateMode = opts?.mode ?? "balance";

  if (gateDisabled()) {
    return {
      ok: true,
      wallet: walletFromRequest(request, body) || "gate-disabled",
      uiAmount: 1,
      mint: JTX_MINT,
      rpc: "bypass",
      mode,
      proven: mode === "proven",
    };
  }

  const wallet = walletFromRequest(request, body);
  if (!wallet || wallet.length < 32) {
    return {
      ok: false,
      response: deny(request, {
        error: "jtx_required",
        message:
          "Pass Solana wallet with ≥1 JTX via X-Solana-Wallet header (or body.wallet). Buy JTX to unlock tools.",
        wallet: wallet || null,
        mode,
      }),
    };
  }

  if (mode === "balance") {
    const rl = jtxRateLimitAllow(`jtx:${wallet}`);
    if (!rl.ok) {
      return {
        ok: false,
        response: deny(
          request,
          {
            error: "jtx_rate_limited",
            message: `Too many JTX-gated requests for this wallet. Retry in ${rl.retryAfterSec}s or prove ownership for settle paths.`,
            wallet,
            retryAfterSec: rl.retryAfterSec,
            mode,
          },
          429,
        ),
      };
    }
  }

  if (mode === "proven") {
    const proof =
      request.headers.get(JTX_PROOF_HEADER)?.trim() ||
      request.headers.get("x-ownership-proof")?.trim() ||
      "";
    const message = request.headers.get(JTX_MESSAGE_HEADER)?.trim() || undefined;
    if (!proof) {
      return {
        ok: false,
        response: deny(request, {
          error: "jtx_ownership_required",
          message:
            "This route requires wallet ownership proof. Sign jOSH-X-Wealth-v0.1:<wallet>:<bucket> and send X-JTX-Proof (base58).",
          wallet,
          mode,
        }),
      };
    }
    const ownership = verifyJtxOwnershipProof({
      wallet,
      signatureBase58: proof,
      message,
    });
    if (!ownership.ok) {
      return {
        ok: false,
        response: deny(request, {
          error: "jtx_ownership_invalid",
          message: ownership.error,
          wallet,
          mode,
        }),
      };
    }
  }

  const rpc = await solanaRpcCall<{ value?: TokenAccountValue }>(
    "getTokenAccountsByOwner",
    [
      wallet,
      { mint: JTX_MINT },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ],
  );

  if (!rpc.ok) {
    return {
      ok: false,
      response: deny(
        request,
        {
          error: "jtx_rpc_failed",
          message: `Could not verify JTX balance: ${rpc.error}`,
          wallet,
          rpc: rpc.rpc,
          mode,
        },
        503,
      ),
    };
  }

  const accounts = rpc.result?.value ?? [];
  let uiAmount = 0;
  for (const a of accounts) {
    const ta = a.account?.data?.parsed?.info?.tokenAmount;
    if (ta?.uiAmount != null) uiAmount += ta.uiAmount;
  }

  if (uiAmount < 1) {
    return {
      ok: false,
      response: deny(request, {
        error: "jtx_required",
        message: `Need ≥1 JTX (have ${uiAmount}). Buy at astroknots.space/buy`,
        wallet,
        uiAmount,
        rpc: rpc.rpc,
        mode,
      }),
    };
  }

  return {
    ok: true,
    wallet,
    uiAmount,
    mint: JTX_MINT,
    rpc: rpc.rpc,
    mode,
    proven: mode === "proven",
  };
}
