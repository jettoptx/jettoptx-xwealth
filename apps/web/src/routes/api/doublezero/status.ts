import { createFileRoute } from "@tanstack/react-router";
import {
  DOUBLEZERO_PLATFORM,
  DOUBLEZERO_SEO,
  DOUBLEZERO_STATUS_LINKS,
  fetchDoubleZeroStatus,
} from "@/lib/doublezero";
import { WEB4_SEO } from "@/lib/web4-seo";

/**
 * GET /api/doublezero/status
 *
 * Proxies public DoubleZero network status for Web4 SEO on /augments
 * and returns the full open-source platform catalog.
 *
 * Upstream: https://data.doublezero.xyz/api/status
 * UI:       https://data.doublezero.xyz/status/links
 */
export const Route = createFileRoute("/api/doublezero/status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const ac = new AbortController();
          const timer = setTimeout(() => ac.abort(), 12_000);
          const status = await fetchDoubleZeroStatus({
            signal: ac.signal,
          }).finally(() => clearTimeout(timer));
          return Response.json({
            ok: true,
            engine: WEB4_SEO.name,
            slogan: WEB4_SEO.slogan,
            doublezero: DOUBLEZERO_SEO,
            status,
            platform: DOUBLEZERO_PLATFORM,
            statusLinks: DOUBLEZERO_STATUS_LINKS,
          });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error: "doublezero_status_unavailable",
              message:
                err instanceof Error ? err.message : "status fetch failed",
              engine: WEB4_SEO.name,
              doublezero: DOUBLEZERO_SEO,
              platform: DOUBLEZERO_PLATFORM,
              statusLinks: DOUBLEZERO_STATUS_LINKS,
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
