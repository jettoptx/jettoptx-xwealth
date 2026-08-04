import { createFileRoute } from "@tanstack/react-router";
import { requireJtxGate } from "@/lib/auth/jtx-require.server";
import {
  agentProbeXMoney,
  enrichHandleWithTinyFish,
  tinyfishConfigured,
  TINYFISH_DASHBOARD,
  TINYFISH_MCP_URL,
} from "@/lib/tinyfish";

/**
 * POST /api/tinyfish/enrich
 * Body: { handle: string, deep?: boolean }
 *
 * Uses TinyFish Fetch (free) to pull X profile + Money pay page.
 * Optional deep=true runs Agent API for harder Money probes (credits).
 *
 * MCP for harnesses: https://agent.tinyfish.ai/mcp
 * @see https://docs.tinyfish.ai/mcp-integration
 */
export const Route = createFileRoute("/api/tinyfish/enrich")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          configured: tinyfishConfigured(),
          mcp: TINYFISH_MCP_URL,
          keys: TINYFISH_DASHBOARD,
          docs: "https://docs.tinyfish.ai/mcp-integration",
        });
      },
      POST: async ({ request }) => {
        let body: {
          handle?: string;
          deep?: boolean;
          wallet?: string;
          solanaWallet?: string;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const gate = await requireJtxGate(request, body);
        if (!gate.ok) return gate.response;

        if (!tinyfishConfigured()) {
          return Response.json(
            {
              error: "tinyfish_not_configured",
              message:
                "Set TINYFISH_API_KEY in the server environment (Vercel / .env.local).",
              mcp: TINYFISH_MCP_URL,
              keys: TINYFISH_DASHBOARD,
            },
            { status: 503 },
          );
        }

        const handle = body.handle?.replace(/^@/, "").trim() ?? "";
        if (!handle || handle.length > 15 || !/^[A-Za-z0-9_]+$/.test(handle)) {
          return Response.json(
            { error: "invalid_handle", message: "Pass a valid X handle" },
            { status: 400 },
          );
        }

        try {
          const enrichment = await enrichHandleWithTinyFish(handle);
          let deep: Awaited<ReturnType<typeof agentProbeXMoney>> | null = null;
          if (body.deep) {
            try {
              deep = await agentProbeXMoney(handle);
              if (deep.hasXMoney !== null) {
                enrichment.hasXMoney = deep.hasXMoney;
                enrichment.evidence.push(
                  `agent probe: ${JSON.stringify(deep.result)}`,
                );
                enrichment.source = "tinyfish-agent";
              }
            } catch (e) {
              enrichment.evidence.push(
                `agent probe skipped: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }

          return Response.json({
            ok: true,
            enrichment,
            deep,
            mcp: TINYFISH_MCP_URL,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return Response.json(
            { error: "enrich_failed", message },
            { status: 502 },
          );
        }
      },
    },
  },
});
