import { createFileRoute } from "@tanstack/react-router";
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
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(),
        }),
    },
  },
});

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, PAYMENT-SIGNATURE, PAYMENT-REQUIRED, X-X402-MODE",
    "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
  };
}

function liveEnabled(request: Request): boolean {
  const env =
    typeof process !== "undefined" &&
    (process.env.X402_LIVE_ENABLED === "true" ||
      process.env.VITE_X402_LIVE_ENABLED === "true");
  const header = request.headers.get("x-x402-mode")?.toLowerCase() === "live";
  // Allow live when client explicitly requests it (operator REAL button).
  // Env flag forces allow even without header.
  return env || header;
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let body: {
    xHandle?: string;
    xMoneyUrl?: string;
    amountUsdc?: string;
    mode?: string;
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
        ...corsHeaders(),
      },
    });
  }

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

  const allowLive =
    liveEnabled(request) || body.mode?.toLowerCase() === "live";
  // Async: dry-run probes Helius; LIVE may broadcast via sendTransaction
  const result = await settlePayment(envelope, signature, { allowLive });
  if (!result.success) {
    return new Response(JSON.stringify(result), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(),
      },
    });
  }

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "PAYMENT-RESPONSE": utf8ToBase64(JSON.stringify(result)),
      "Cache-Control": "no-store",
      ...corsHeaders(),
    },
  });
}
