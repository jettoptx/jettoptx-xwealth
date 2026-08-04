import { createFileRoute } from "@tanstack/react-router";
import { buildX402SignMessage } from "@/lib/privy-pay-sign";
import { OPTX_LINKS } from "@/lib/optx-links";
import {
  buildPaymentRequired,
  encodePaymentRequired,
} from "@/lib/x402";
import {
  getChallenge,
  joeBuzzWebhookConfigured,
  joeBuzzWebhookUrl,
  newChallengeId,
  putChallenge,
  type X402SignChallengeRecord,
} from "@/lib/x402-sign-challenge-store";

/**
 * JOE Buzz / harness sign challenge for x402 LIVE.
 * - POST (create): mint challenge + optional Buzz webhook notify
 * - POST (action=submit): harness / paste / Privy attaches signature
 * - GET ?cid=: poll status
 *
 * Buzz DM is not native in this repo yet — enable JOE_BUZZ_WEBHOOK_URL
 * (or JETTCHAT_NOTIFY_URL) server-side to push into JettChat/Buzz.
 */
export const Route = createFileRoute("/api/x402/sign-challenge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cid = new URL(request.url).searchParams.get("cid");
        if (!cid) {
          return Response.json({ error: "cid required" }, { status: 400 });
        }
        const rec = getChallenge(cid);
        if (!rec) {
          return Response.json({
            status: "unknown",
            cid,
            note: "Challenge not in this instance — paste signature or retry create (serverless memory).",
          });
        }
        return Response.json({
          status: rec.status,
          cid: rec.cid,
          signature: rec.signature,
          fromWallet: rec.fromWallet,
          approvedVia: rec.approvedVia,
          buzzNotified: rec.buzzNotified,
          message: rec.message,
          expiresAt: rec.expiresAt,
        });
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          action?: string;
          cid?: string;
          signature?: string;
          fromWallet?: string;
          approvedVia?: X402SignChallengeRecord["approvedVia"];
          amountUsdc?: string;
          xHandle?: string;
          xMoneyUrl?: string;
          resource?: string;
        };

        if (body.action === "submit") {
          return handleSubmit(body);
        }
        return handleCreate(request, body);
      },
    },
  },
});

async function handleSubmit(body: {
  cid?: string;
  signature?: string;
  fromWallet?: string;
  approvedVia?: X402SignChallengeRecord["approvedVia"];
}): Promise<Response> {
  const cid = body.cid?.trim();
  const signature = body.signature?.trim();
  if (!cid || !signature) {
    return Response.json(
      { error: "cid and signature required" },
      { status: 400 },
    );
  }
  let rec = getChallenge(cid);
  if (!rec) {
    // Accept orphan submit so harness can complete across instances
    rec = {
      cid,
      status: "verified",
      createdAt: Date.now(),
      expiresAt: Date.now() + 300_000,
      xHandle: "unknown",
      xMoneyUrl: "",
      amountUsdc: "",
      resource: "",
      message: "",
      paymentRequired: "",
      buzzNotified: false,
      signature,
      fromWallet: body.fromWallet,
      approvedVia: body.approvedVia ?? "harness",
    };
  } else {
    if (rec.status === "expired") {
      return Response.json({ error: "challenge expired", cid }, { status: 410 });
    }
    rec.status = "verified";
    rec.signature = signature;
    rec.fromWallet = body.fromWallet;
    rec.approvedVia = body.approvedVia ?? "harness";
  }
  putChallenge(rec);
  return Response.json({
    status: "verified",
    cid: rec.cid,
    signature: rec.signature,
    fromWallet: rec.fromWallet,
    approvedVia: rec.approvedVia,
  });
}

async function handleCreate(
  request: Request,
  body: {
    amountUsdc?: string;
    xHandle?: string;
    xMoneyUrl?: string;
    resource?: string;
  },
): Promise<Response> {
  const url = new URL(request.url);
  const xHandle = (body.xHandle || "jettoptx").replace(/^@/, "");
  const xMoneyUrl =
    body.xMoneyUrl || `https://x.com/i/money/pay/${xHandle}`;
  const amountUsdc = body.amountUsdc || "0.10";
  const resource =
    body.resource || `${url.origin}/api/x402/pay`;

  const required = buildPaymentRequired({
    amountUsdc,
    xHandle,
    xMoneyUrl,
    resource,
  });
  const paymentRequired = encodePaymentRequired(required);
  const message = buildX402SignMessage({
    amountUsdc,
    xHandle,
    xMoneyUrl,
    resource,
  });

  const cid = newChallengeId();
  const now = Date.now();
  const rec: X402SignChallengeRecord = {
    cid,
    status: "pending",
    createdAt: now,
    expiresAt: now + 10 * 60_000,
    xHandle,
    xMoneyUrl,
    amountUsdc,
    resource,
    message,
    paymentRequired,
    buzzNotified: false,
  };

  const webhook = joeBuzzWebhookUrl();
  if (webhook) {
    try {
      const notify = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "x402_sign_challenge",
          channel: "buzz",
          agent: "JOE",
          cid,
          xHandle,
          amountUsdc,
          asset: "USDC",
          network: "solana-mainnet",
          message,
          paymentRequired,
          resource,
          xMoneyUrl,
          approveUrl: `${url.origin}/api/x402/sign-challenge?cid=${encodeURIComponent(cid)}`,
          cloudflareWallet: OPTX_LINKS.cloudflareWalletHandle,
          text: `JOE · x402 LIVE sign challenge\n${amountUsdc} USDC → @${xHandle}\ncid: ${cid}\n\n${message}\n\nApprove in harness or POST signature to /api/x402/sign-challenge`,
        }),
        cache: "no-store",
      });
      if (notify.ok) {
        rec.buzzNotified = true;
        rec.status = "notified";
      } else {
        rec.buzzNotifyError = `webhook HTTP ${notify.status}`;
      }
    } catch (e) {
      rec.buzzNotifyError =
        e instanceof Error ? e.message : "webhook failed";
    }
  }

  putChallenge(rec);

  const harnessSkill = `# JOE · x402 LIVE sign challenge

cid: ${cid}
amount: ${amountUsdc} USDC
payTo: ${xMoneyUrl}
xHandle: @${xHandle}
resource: ${resource}
cfWallet: ${OPTX_LINKS.cloudflareWalletHandle}

## Message to sign
\`\`\`
${message}
\`\`\`

## Approve
1. Sign the message (agent wallet / operator).
2. POST ${url.origin}/api/x402/sign-challenge
\`\`\`json
{
  "action": "submit",
  "cid": "${cid}",
  "signature": "<base58-or-hex-sig>",
  "fromWallet": "<solana-pubkey>",
  "approvedVia": "harness"
}
\`\`\`
3. DOJO poll will settle + open X Money Pay now.
`;

  return Response.json(
    {
      cid,
      status: rec.status,
      expiresAt: rec.expiresAt,
      message,
      paymentRequired,
      amountUsdc,
      xHandle,
      xMoneyUrl,
      resource,
      buzzNotified: rec.buzzNotified,
      buzzNotifyError: rec.buzzNotifyError,
      buzzWebhookConfigured: joeBuzzWebhookConfigured(),
      buzzChannelUrl: OPTX_LINKS.buzzChannel,
      harnessSkill,
      cloudflareWalletHandle: OPTX_LINKS.cloudflareWalletHandle,
      note: rec.buzzNotified
        ? "JOE notified Buzz webhook — approve in JettChat/Buzz or harness."
        : "Buzz DM webhook not configured — use harness skill below (or set JOE_BUZZ_WEBHOOK_URL). MOJO QR is not the primary path.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
