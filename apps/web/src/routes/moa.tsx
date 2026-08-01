import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/moa")({
  component: MoaToWarp,
});

/** /moa deep-link → WARP nodes graph (WealthMoaBuilder) */
function MoaToWarp() {
  return (
    <Navigate
      to="/warp"
      search={{ market: undefined, vibe: undefined }}
      replace
    />
  );
}
