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
              label: OPTX_LINKS.buzzChannelLabel,
              note: joeBuzzNotify
                ? "JOE_BUZZ_WEBHOOK_URL configured — create challenge will POST notify payload."
                : "Set JOE_BUZZ_WEBHOOK_URL (or JETTCHAT_NOTIFY_URL) to push sign challenges into Buzz/JettChat. Until then, harness skill on DOJO is the approve surface.",
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
