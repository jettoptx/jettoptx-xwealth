import { createFileRoute } from "@tanstack/react-router";
import { sendRawTransactionBase64 } from "@/lib/helius-rpc";

/**
 * Broadcast a Mojo-signed Solana tx (base64) via Helius.
 * Hard-gated: requires server `X402_LIVE_ENABLED=true`. No client header bypass.
 */
export const Route = createFileRoute("/api/mojo/broadcast")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const live =
          typeof process !== "undefined" &&
          process.env.X402_LIVE_ENABLED === "true";
        if (!live) {
          return Response.json(
            {
              ok: false,
              error:
                "Broadcast disabled — set server X402_LIVE_ENABLED=true (operator LIVE only)",
            },
            { status: 403 },
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          signedTx?: string;
          signedTxBase64?: string;
        };
        const raw = (body.signedTx || body.signedTxBase64 || "").trim();
        if (!raw) {
          return Response.json(
            { error: "signedTx required (base64)" },
            { status: 400 },
          );
        }
        const sent = await sendRawTransactionBase64(raw);
        if (!sent.ok) {
          return Response.json(
            { ok: false, error: sent.error, rpc: sent.rpc },
            { status: 502 },
          );
        }
        return Response.json({
          ok: true,
          signature: sent.signature,
          rpc: sent.rpc,
          explorer: `https://solscan.io/tx/${sent.signature}`,
        });
      },
    },
  },
});
