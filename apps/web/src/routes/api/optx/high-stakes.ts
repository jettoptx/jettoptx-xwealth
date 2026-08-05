import { createFileRoute } from "@tanstack/react-router";
import { requireJtxGate } from "@/lib/auth/jtx-require.server";

/**
 * Proxy → AARON approve_action challenge (OPTX high-stakes / SEND-02).
 * POST mints; GET polls status (+ result.approval_id when verified).
 *
 * @see jettoptx-aaron-router/docs/mojo-approve-action-challenge.md
 */
const AARON =
  (typeof process !== "undefined" &&
    (process.env.AARON_ROUTER_URL || process.env.VITE_AARON_ROUTER_URL)) ||
  "https://aaron.jettoptics.ai";

export const Route = createFileRoute("/api/optx/high-stakes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          origin?: string;
          privy_did?: string | null;
          wallet?: string;
          solanaWallet?: string;
          action?: {
            kind?: string;
            summary?: string;
            amount?: string | null;
            asset?: string | null;
            symbol?: string | null;
            venue?: string | null;
            size?: string | null;
            notional_usdc?: string | null;
            agent?: string | null;
            harness?: string | null;
            policy_ref?: string | null;
            resource?: string | null;
            on_chain?: Record<string, unknown> | null;
            extra?: Record<string, unknown> | null;
          };
        };

        const gate = await requireJtxGate(request, body, { mode: "proven" });
        if (!gate.ok) return gate.response;

        const origin = body.origin || "xwealth";
        const action = body.action;
        if (!action?.kind?.trim() || !action?.summary?.trim()) {
          return Response.json(
            { error: "action.kind and action.summary required" },
            { status: 400 },
          );
        }
        try {
          const r = await fetch(`${AARON}/jett/totp/challenge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "approve_action",
              origin,
              privy_did: body.privy_did ?? null,
              action,
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
          const qrPayload = `jettmojo://approve?cid=${cid}&origin=${origin}&exp=${expSec}`;
          return Response.json({
            cid,
            type: "approve_action",
            origin,
            exp: expSec,
            expiresAt: expSec * 1000,
            qrPayload,
            qr_payload: qrPayload,
            action: d.action ?? action,
            needs_aaron_deploy:
              typeof d.qrPayload === "string" &&
              !String(d.qrPayload).includes("approve"),
          });
        } catch {
          const cid = `ch_local_ap_${Date.now().toString(36)}`;
          const exp = Math.floor(Date.now() / 1000) + 300;
          const qrPayload = `jettmojo://approve?cid=${cid}&origin=${origin}&exp=${exp}`;
          return Response.json({
            cid,
            type: "approve_action",
            origin,
            exp,
            expiresAt: exp * 1000,
            qrPayload,
            qr_payload: qrPayload,
            action,
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
            type: "approve_action",
            degraded: true,
          });
        }
      },
    },
  },
});
