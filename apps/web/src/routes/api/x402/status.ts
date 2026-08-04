import { createFileRoute } from "@tanstack/react-router";
import { heliusConfigured, rpcProviderLabel } from "@/lib/helius-rpc";
import { OPTX_LINKS } from "@/lib/optx-links";

/**
 * Operator-facing x402 rail health (no secrets).
 * DOJO footer / X402Panel use this instead of a static “needs X402_LIVE_ENABLED” string.
 */
export const Route = createFileRoute("/api/x402/status")({
  server: {
    handlers: {
      GET: async () => {
        const liveEnabled =
          typeof process !== "undefined" &&
          process.env.X402_LIVE_ENABLED === "true";
        const helius = heliusConfigured();
        return Response.json(
          {
            ok: true,
            liveEnabled,
            heliusConfigured: helius,
            rpc: rpcProviderLabel(),
            cloudflareWallet: {
              handle: OPTX_LINKS.cloudflareWalletHandle,
              url: OPTX_LINKS.cloudflareWallet,
              blog: OPTX_LINKS.cloudflareWalletsBlog,
              role: "agent-identity",
              note: "Cloudflare Wallets identity / future Monetization Gateway rail — does not settle Solana USDC today. LIVE settle uses Privy sign + X Money.",
            },
          },
          {
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
          },
        );
      },
    },
  },
});
