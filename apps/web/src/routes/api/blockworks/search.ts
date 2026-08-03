import { createFileRoute } from "@tanstack/react-router";
import { requireJtxGate } from "@/lib/auth/jtx-require.server";
import {
  BLOCKWORKS_MCP_URL,
  BLOCKWORKS_PRODUCT,
  MESSARI_KEYS,
  blockworksKeyConfigured,
  searchCryptoDefi,
} from "@/lib/blockworks";
import { WEB4_SEO } from "@/lib/web4-seo";

/**
 * GET  /api/blockworks/search — status + MCP pointer
 * POST /api/blockworks/search — crypto / DeFi token search
 *
 * Native Blockworks (Messari) lane for Web4 Agent SEO on /augments.
 * @see https://blockworks.com/products/api-mcp
 * @see https://docs.messari.io/
 */
export const Route = createFileRoute("/api/blockworks/search")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          engine: "Blockworks · Messari",
          product: BLOCKWORKS_PRODUCT,
          mcp: BLOCKWORKS_MCP_URL,
          keys: MESSARI_KEYS,
          docs: "https://docs.messari.io/",
          keyConfigured: blockworksKeyConfigured(),
          publicSearch: true,
          slogan: WEB4_SEO.slogan,
          thesis:
            "THE SEO of Web4 — powered by AstroKnots Algo. Native crypto/DeFi ranker — tokens, protocols, sectors.",
          presets: WEB4_SEO.cryptoQueries,
        });
      },
      POST: async ({ request }) => {
        let body: {
          query?: string;
          mode?: "crypto" | "defi" | "all";
          limit?: number;
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

        const query = body.query?.trim() ?? "";
        if (!query || query.length > 120) {
          return Response.json(
            {
              error: "invalid_query",
              message: "query required (max 120 chars) — e.g. solana, aave, jup",
            },
            { status: 400 },
          );
        }

        try {
          const result = await searchCryptoDefi({
            query,
            mode: body.mode ?? "crypto",
            limit: body.limit ?? 12,
          });
          return Response.json({
            ok: true,
            engine: WEB4_SEO.name,
            lane: "blockworks",
            ...result,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return Response.json(
            {
              error: "search_failed",
              message,
              mcp: BLOCKWORKS_MCP_URL,
              product: BLOCKWORKS_PRODUCT,
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
