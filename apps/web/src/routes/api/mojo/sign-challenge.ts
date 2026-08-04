import { createFileRoute } from "@tanstack/react-router";
import { requireJtxGate } from "@/lib/auth/jtx-require.server";

/**
 * Proxy → AARON Mojo sign_tx challenge (same rail as jtx.chat login QR).
 * POST mints; GET polls status (+ result.signature / signedTx when verified).
 *
 * @see jettoptx-aaron-router/docs/mojo-sign-tx-challenge.md
 */
const AARON =
  (typeof process !== "undefined" &&
    (process.env.AARON_ROUTER_URL || process.env.VITE_AARON_ROUTER_URL)) ||
  "https://aaron.jettoptics.ai";

export const Route = createFileRoute("/api/mojo/sign-challenge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          origin?: string;
          privy_did?: string | null;
          wallet?: string;
          solanaWallet?: string;
          tx?: {
            amount?: string;
            payTo?: string;
            destination?: string | null;
            mint?: string;
            asset?: string;
            network?: string;
            memo?: string | null;
            unsignedTx?: string | null;
            message?: string | null;
            resource?: string | null;
          };
        };

        const gate = await requireJtxGate(request, body, { mode: "proven" });
        if (!gate.ok) return gate.response;

        const origin = body.origin || "xwealth";
        const tx = body.tx;
        if (!tx?.amount || !tx?.payTo) {
          return Response.json(
            { error: "tx.amount and tx.payTo required" },
            { status: 400 },
          );
        }
        try {
          const r = await fetch(`${AARON}/jett/totp/challenge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "sign_tx",
              origin,
              privy_did: body.privy_did ?? null,
              tx: {
                amount: String(tx.amount),
                mint:
                  tx.mint ||
                  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                asset: tx.asset || "USDC",
                payTo: tx.payTo,
                destination: tx.destination ?? null,
                network: tx.network || "solana-mainnet",
                memo: tx.memo ?? null,
                unsignedTx: tx.unsignedTx ?? null,
                message: tx.message ?? null,
                resource: tx.resource ?? null,
              },
            }),
            cache: "no-store",
          });
          if (!r.ok) throw new Error(`aaron ${r.status}`);
          const d = (await r.json()) as Record<string, unknown>;
          const cid = String(d.cid ?? "");
          const expSec =
            typeof d.exp === "number"
              ? d.exp
              : Math.floor(Date.now() / 1000) + 300;
          const qrPayload =
            (typeof d.qrPayload === "string" && d.qrPayload) ||
            (typeof d.qr_payload === "string" && d.qr_payload) ||
            `jettmojo://sign?cid=${cid}&origin=${origin}&exp=${expSec}`;
          return Response.json({
            cid,
            type: "sign_tx",
            origin,
            exp: expSec,
            expiresAt: expSec * 1000,
            qrPayload,
            qr_payload: qrPayload,
            tx: d.tx ?? tx,
          });
        } catch {
          const cid = `ch_local_sign_${Date.now().toString(36)}`;
          const exp = Math.floor(Date.now() / 1000) + 300;
          const qrPayload = `jettmojo://sign?cid=${cid}&origin=${origin}&exp=${exp}`;
          return Response.json({
            cid,
            type: "sign_tx",
            origin,
            exp,
            expiresAt: exp * 1000,
            qrPayload,
            qr_payload: qrPayload,
            tx,
            degraded: true,
          });
        }
      },
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const cid = url.searchParams.get("cid");
        if (!cid) {
          return Response.json({ error: "cid required" }, { status: 400 });
        }
        try {
          const r = await fetch(
            `${AARON}/jett/totp/status?cid=${encodeURIComponent(cid)}`,
            { cache: "no-store" },
          );
          if (!r.ok) throw new Error(`aaron ${r.status}`);
          return Response.json(await r.json());
        } catch {
          return Response.json({
            status: "pending",
            cid,
            type: "sign_tx",
            degraded: true,
          });
        }
      },
    },
  },
});
