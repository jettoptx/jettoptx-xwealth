import { createFileRoute } from "@tanstack/react-router";
import { jtxCorsHeaders } from "@/lib/auth/jtx-cors";
import { requireJtxGate } from "@/lib/auth/jtx-require.server";
import {
  base64ToUtf8,
  buildPaymentRequired,
  encodePaymentRequired,
  settlePayment,
  utf8ToBase64,
  type X402PaymentRequired,
} from "@/lib/x402";

/**
 * x402-style pay endpoint for agent harnesses.
 * - Without PAYMENT-SIGNATURE → 402 + payment instructions
 * - With PAYMENT-SIGNATURE (dryRun) → dry-run settle receipt
 * - With PAYMENT-SIGNATURE (live) + X402_LIVE_ENABLED → live intent + X Money actionUrl
 */
export const Route = createFileRoute("/api/x402/pay")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request),
        }),
    },
  },
});

function corsHeaders(request?: Request): Record<string, string> {
  if (request) return jtxCorsHeaders(request);
  // OPTIONS preflight without Origin still advertises methods/headers
  return {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, PAYMENT-SIGNATURE, PAYMENT-REQUIRED, X-X402-MODE, X-Solana-Wallet, X-Wallet, X-JTX-Proof, X-JTX-Message",
    "Access-Control-Expose-Headers":
      "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-JTX-Buy",
    Vary: "Origin",
  };
}

/**
 * LIVE settle is server-env only. Client headers / body.mode / VITE_* must NOT
 * enable mainnet spend — they may request live after the env gate passes.
 */
function liveEnabled(): boolean {
  return (
    typeof process !== "undefined" && process.env.X402_LIVE_ENABLED === "true"
  );
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let body: {
    xHandle?: string;
    xMoneyUrl?: string;
    amountUsdc?: string;
    mode?: string;
    wallet?: string;
    solanaWallet?: string;
  } = {};

  if (request.method === "POST") {
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }
  }

  const xHandle =
    body.xHandle || url.searchParams.get("handle") || "jettoptx";
  const xMoneyUrl =
    body.xMoneyUrl ||
    url.searchParams.get("payTo") ||
    `https://x.com/i/money/pay/${xHandle}`;
  const amountUsdc =
    body.amountUsdc || url.searchParams.get("amount") || "0.10";

  const resource = `${url.origin}/api/x402/pay`;
  const required: X402PaymentRequired = buildPaymentRequired({
    amountUsdc,
    xHandle,
    xMoneyUrl,
    resource,
  });

  const signature =
    request.headers.get("payment-signature") ||
    request.headers.get("PAYMENT-SIGNATURE") ||
    request.headers.get("x-payment");

  if (!signature) {
    const encoded = encodePaymentRequired(required);
    return new Response(JSON.stringify(required, null, 2), {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-REQUIRED": encoded,
        "Cache-Control": "no-store",
        ...corsHeaders(request),
      },
    });
  }

  // Settle: ≥1 JTX + ownership proof (advertise/402 catalog stays public).
  const gate = await requireJtxGate(request, body, { mode: "proven" });
  if (!gate.ok) return gate.response;

  let envelope = required;
  const prHeader =
    request.headers.get("payment-required") ||
    request.headers.get("PAYMENT-REQUIRED");
  if (prHeader) {
    try {
      envelope = JSON.parse(base64ToUtf8(prHeader)) as X402PaymentRequired;
    } catch {
      /* use built envelope */
    }
  }

  const allowLive = liveEnabled();
  // Client may send mode=live / X-X402-MODE — ignored unless X402_LIVE_ENABLED=true
  const result = await settlePayment(envelope, signature, { allowLive });
  if (!result.success) {
    return new Response(JSON.stringify(result), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(request),
      },
    });
  }

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "PAYMENT-RESPONSE": utf8ToBase64(JSON.stringify(result)),
      "Cache-Control": "no-store",
      ...corsHeaders(request),
    },
  });
}
