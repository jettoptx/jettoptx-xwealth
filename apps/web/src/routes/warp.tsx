import { createFileRoute } from "@tanstack/react-router";
import { WealthMoaBuilder } from "@/components/moa/WealthMoaBuilder";

export const Route = createFileRoute("/warp")({
  validateSearch: (search: Record<string, unknown>) => ({
    market: search.market === "1" || search.market === 1 ? "1" : undefined,
    vibe:
      typeof search.vibe === "string" && search.vibe.length > 0
        ? search.vibe.replace(/^@+/, "").slice(0, 15)
        : undefined,
  }),
  component: WarpGraphPage,
});

/**
 * WARP — full-screen WealthMoaBuilder only.
 * No top-left Augments shell / @handle chips (those open from top-right logo menu).
 * Market mode shows /augments?embed=1 cards panel. Search: ?market=1&vibe=
 */
function WarpGraphPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <WealthMoaBuilder />
    </div>
  );
}
