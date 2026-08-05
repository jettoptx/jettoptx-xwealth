import { createFileRoute } from "@tanstack/react-router";
import { heliusConfigured, rpcProviderLabel } from "@/lib/helius-rpc";
import { OPTX_LINKS } from "@/lib/optx-links";
import { joeBuzzWebhookConfigured } from "@/lib/x402-sign-challenge-store";

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
        const joeBuzzNotify = joeBuzzWebhookConfigured();
        return Response.json(
          {
            ok: true,
            liveEnabled,
            heliusConfigured: helius,
            rpc: rpcProviderLabel(),
            joeBuzzNotifyConfigured: joeBuzzNotify,
            primaryLiveSignPath: "joe-buzz-or-harness",
            cloudflareWallet: {
              handle: OPTX_LINKS.cloudflareWalletHandle,
              url: OPTX_LINKS.cloudflareWallet,
              blog: OPTX_LINKS.cloudflareWalletsBlog,
              role: "agent-identity",
              note: "Cloudflare Wallets identity / future Monetization Gateway rail — does not settle Solana USDC today. LIVE settle uses JOE Buzz/harness sign challenge + X Money.",
            },
            buzzChannel: {
              url: OPTX_LINKS.buzzChannel,
              web: OPTX_LINKS.buzzChannelWeb,
              relay: OPTX_LINKS.buzzRelayUrl,
              label: OPTX_LINKS.buzzChannelLabel,
              note: joeBuzzNotify
                ? "JOE_BUZZ_WEBHOOK_URL configured — create challenge POSTs notify bridge; canonical chat is Buzz Desktop (JOE community)."
                : "Set JOE_BUZZ_WEBHOOK_URL (or JETTCHAT_NOTIFY_URL) for notify bridge. Canonical chat is Buzz Desktop → wss://joe.communities.buzz.xyz. Harness skill remains the fallback approve surface.",
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
