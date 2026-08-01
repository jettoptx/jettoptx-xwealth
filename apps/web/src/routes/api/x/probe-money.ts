import { createFileRoute } from "@tanstack/react-router";
import {
  enrichHandleWithTinyFish,
  tinyfishConfigured,
  TINYFISH_DASHBOARD,
} from "@/lib/tinyfish";
import { probeXMoney } from "@/lib/x-api";

/**
 * POST /api/x/probe-money
 * Body: { handles: string[] }
 *
 * Best-effort X Money enrollment for a batch of handles.
 * Prefers TinyFish Fetch (bypasses login walls); falls back to HTML probe.
 * Cap: 20 handles / request, concurrency 3.
 */
export const Route = createFileRoute("/api/x/probe-money")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { handles?: string[] };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const handles = [
          ...new Set(
            (body.handles ?? [])
              .map((h) => String(h).replace(/^@/, "").trim().toLowerCase())
              .filter((h) => h.length >= 1 && h.length <= 15 && /^[a-z0-9_]+$/i.test(h)),
          ),
        ].slice(0, 20);

        if (handles.length === 0) {
          return Response.json(
            { error: "no_handles", message: "Pass handles: string[]" },
            { status: 400 },
          );
        }

        const useTiny = tinyfishConfigured();
        const results: Record<
          string,
          { hasXMoney: boolean | null; source: string; evidence?: string[] }
        > = {};

        // Concurrency 3
        let i = 0;
        async function worker() {
          while (i < handles.length) {
            const idx = i++;
            const h = handles[idx]!;
            if (useTiny) {
              try {
                const e = await enrichHandleWithTinyFish(h);
                results[h] = {
                  hasXMoney: e.hasXMoney,
                  source: "tinyfish-fetch",
                  evidence: e.evidence,
                };
                continue;
              } catch {
                /* fall back */
              }
            }
            const v = await probeXMoney(h);
            results[h] = {
              hasXMoney: v,
              source: "html-probe",
            };
          }
        }

        await Promise.all([worker(), worker(), worker()]);

        const yes = Object.values(results).filter((r) => r.hasXMoney === true).length;
        const no = Object.values(results).filter((r) => r.hasXMoney === false).length;
        const unknown = Object.values(results).filter(
          (r) => r.hasXMoney == null,
        ).length;

        return Response.json({
          ok: true,
          tinyfish: useTiny,
          keys: useTiny ? undefined : TINYFISH_DASHBOARD,
          counts: { yes, no, unknown, total: handles.length },
          results,
        });
      },
    },
  },
});
