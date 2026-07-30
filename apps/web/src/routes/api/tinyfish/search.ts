import { createFileRoute } from "@tanstack/react-router";
import {
  extractHandlesFromSearch,
  searchWeb4,
  tinyfishConfigured,
  TINYFISH_DASHBOARD,
  TINYFISH_MCP_URL,
} from "@/lib/tinyfish";
import { WEB4_SEO } from "@/lib/web4-seo";

/**
 * GET  /api/tinyfish/search — status + product thesis
 * POST /api/tinyfish/search — Web4 discovery query
 *
 * Body: { query, location?, language?, domainType?, purpose?, includeDomains?, ... }
 *
 * @see https://docs.tinyfish.ai/search-api/reference
 * @see https://docs.tinyfish.ai/mcp-integration
 */
export const Route = createFileRoute("/api/tinyfish/search")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          configured: tinyfishConfigured(),
          engine: WEB4_SEO.name,
          slogan: WEB4_SEO.slogan,
          thesis: WEB4_SEO.thesis,
          mcp: TINYFISH_MCP_URL,
          keys: TINYFISH_DASHBOARD,
          docs: "https://docs.tinyfish.ai/search-api/reference",
          presets: WEB4_SEO.defaultQueries,
        });
      },
      POST: async ({ request }) => {
        if (!tinyfishConfigured()) {
          return Response.json(
            {
              error: "tinyfish_not_configured",
              message: "Set TINYFISH_API_KEY for Web4 Discover search.",
              mcp: TINYFISH_MCP_URL,
              keys: TINYFISH_DASHBOARD,
            },
            { status: 503 },
          );
        }

        let body: {
          query?: string;
          location?: string;
          language?: string;
          domainType?: "web" | "news" | "research_paper";
          purpose?: string;
          includeDomains?: string;
          excludeDomains?: string;
          recencyMinutes?: number;
          page?: number;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const query = body.query?.trim() ?? "";
        if (!query || query.length > 500) {
          return Response.json(
            { error: "invalid_query", message: "query required (max 500 chars)" },
            { status: 400 },
          );
        }

        try {
          const purpose =
            body.purpose?.trim() ||
            `X Wealth Web4 Agent SEO on /augments: ${query}`;

          const result = await searchWeb4({
            query,
            location: body.location ?? "US",
            language: body.language ?? "en",
            domainType: body.domainType ?? "web",
            purpose,
            includeDomains: body.includeDomains,
            excludeDomains: body.excludeDomains,
            recencyMinutes: body.recencyMinutes,
            page: body.page ?? 0,
          });

          const handles = extractHandlesFromSearch(result.results);

          return Response.json({
            ok: true,
            engine: WEB4_SEO.name,
            ...result,
            handles,
            mcp: TINYFISH_MCP_URL,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return Response.json(
            { error: "search_failed", message },
            { status: 502 },
          );
        }
      },
    },
  },
});
