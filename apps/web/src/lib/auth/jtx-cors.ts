/**
 * Origin allowlist for JTX-gated API responses.
 * Hedgehog P0 — no CORS * on gated money/tool routes.
 */

const DEFAULT_ORIGINS = [
  "https://xwealth.space",
  "https://www.xwealth.space",
  "https://jtx.astroknots.space",
  "https://astroknots.space",
  "https://jettoptx.chat",
  "https://www.jettoptx.chat",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

function extraOrigins(): string[] {
  const raw =
    typeof process !== "undefined"
      ? process.env.JTX_CORS_ORIGINS?.trim()
      : undefined;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function allowedOrigins(): string[] {
  return [...DEFAULT_ORIGINS, ...extraOrigins()];
}

/** Resolve Access-Control-Allow-Origin for a request (no wildcard). */
export function corsOriginFor(request: Request): string | null {
  const origin = request.headers.get("Origin")?.trim();
  if (!origin) return null;
  const allow = allowedOrigins();
  if (allow.includes(origin)) return origin;
  return null;
}

export function jtxCorsHeaders(request: Request): Record<string, string> {
  const origin = corsOriginFor(request);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Solana-Wallet, X-Wallet, X-JTX-Proof, X-JTX-Message, PAYMENT-SIGNATURE, PAYMENT-REQUIRED, X-X402-MODE",
    "Access-Control-Expose-Headers":
      "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-JTX-Buy",
    "Vary": "Origin",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
