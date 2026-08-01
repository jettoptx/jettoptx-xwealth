/**
 * Helius Solana RPC — server-side only.
 * Used by /api/solana-rpc proxy, JTX gate (via proxy), and x402 live send.
 *
 * Env (prefer server secrets, never commit):
 *   HELIUS_API_KEY          — dashboard key alone
 *   SOLANA_RPC_URL          — full URL incl. ?api-key=… (wins if set)
 *   HELIUS_RPC_URL          — alias of SOLANA_RPC_URL
 */

const PUBLIC_MAINNET = "https://api.mainnet-beta.solana.com";

export type HeliusRpcJson = {
  jsonrpc?: string;
  id?: number | string;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};

/** Resolve mainnet RPC URL. API key never exposed to browser if only set as HELIUS_API_KEY. */
export function resolveSolanaRpcUrl(): string {
  const full =
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.HELIUS_RPC_URL?.trim() ||
    process.env.VITE_SOLANA_RPC_URL?.trim();
  if (full) return full;

  const key =
    process.env.HELIUS_API_KEY?.trim() ||
    process.env.XWEALTH_HELIUS_API_KEY?.trim();
  if (key) {
    return `https://mainnet.helius-rpc.com/?api-key=${key}`;
  }
  return PUBLIC_MAINNET;
}

export function heliusConfigured(): boolean {
  const url = resolveSolanaRpcUrl();
  return (
    url.includes("helius") ||
    Boolean(process.env.HELIUS_API_KEY?.trim()) ||
    Boolean(process.env.SOLANA_RPC_URL?.trim())
  );
}

/** Redacted label for receipts / logs (never the full api-key). */
export function rpcProviderLabel(url = resolveSolanaRpcUrl()): string {
  if (url.includes("helius-rpc.com") || url.includes("helius")) return "helius-mainnet";
  if (url.includes("quicknode")) return "quicknode";
  if (url.includes("mainnet-beta.solana.com")) return "solana-public";
  try {
    return new URL(url).hostname;
  } catch {
    return "rpc";
  }
}

export async function solanaRpcCall<T = unknown>(
  method: string,
  params: unknown[] = [],
  opts?: { timeoutMs?: number },
): Promise<{ ok: true; result: T; rpc: string } | { ok: false; error: string; rpc: string }> {
  const rpc = resolveSolanaRpcUrl();
  const timeoutMs = opts?.timeoutMs ?? 20_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: HeliusRpcJson;
    try {
      json = JSON.parse(text) as HeliusRpcJson;
    } catch {
      return {
        ok: false,
        error: `RPC HTTP ${res.status} (non-JSON)`,
        rpc: rpcProviderLabel(rpc),
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message
          ? `HTTP ${res.status}: ${json.error.message}`
          : `HTTP ${res.status}`,
        rpc: rpcProviderLabel(rpc),
      };
    }
    if (json.error) {
      return {
        ok: false,
        error: json.error.message ?? `RPC error ${json.error.code ?? ""}`,
        rpc: rpcProviderLabel(rpc),
      };
    }
    return { ok: true, result: json.result as T, rpc: rpcProviderLabel(rpc) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, rpc: rpcProviderLabel(rpc) };
  } finally {
    clearTimeout(timer);
  }
}

export async function heliusHealth(): Promise<{
  ok: boolean;
  slot?: number;
  health?: string;
  rpc: string;
  error?: string;
}> {
  const health = await solanaRpcCall<string>("getHealth");
  const slot = await solanaRpcCall<number>("getSlot", [{ commitment: "confirmed" }]);
  if (!health.ok && !slot.ok) {
    return {
      ok: false,
      rpc: health.rpc,
      error: health.error || slot.error,
    };
  }
  return {
    ok: true,
    health: health.ok ? String(health.result) : undefined,
    slot: slot.ok ? slot.result : undefined,
    rpc: slot.ok ? slot.rpc : health.rpc,
  };
}

/**
 * Broadcast a signed Solana transaction (base64) via Helius.
 * Used for x402 live settle when the harness attaches a serialized tx.
 */
export async function sendRawTransactionBase64(
  serializedBase64: string,
  opts?: { skipPreflight?: boolean; maxRetries?: number },
): Promise<
  | { ok: true; signature: string; rpc: string }
  | { ok: false; error: string; rpc: string }
> {
  const raw = serializedBase64.trim();
  if (!raw || raw.length < 32) {
    return {
      ok: false,
      error: "serializedTransaction missing or too short",
      rpc: rpcProviderLabel(),
    };
  }

  const out = await solanaRpcCall<string>("sendTransaction", [
    raw,
    {
      encoding: "base64",
      skipPreflight: opts?.skipPreflight ?? false,
      maxRetries: opts?.maxRetries ?? 3,
      preflightCommitment: "confirmed",
    },
  ]);

  if (!out.ok) {
    return { ok: false, error: out.error, rpc: out.rpc };
  }
  if (typeof out.result !== "string" || !out.result) {
    return {
      ok: false,
      error: "sendTransaction returned empty signature",
      rpc: out.rpc,
    };
  }
  return { ok: true, signature: out.result, rpc: out.rpc };
}

/**
 * Forward arbitrary JSON-RPC body to Helius (proxy handler).
 * Strips browser Origin so public RPCs don't 403; keeps api-key server-side.
 */
export async function proxySolanaJsonRpc(
  body: unknown,
): Promise<{ status: number; json: unknown }> {
  const rpc = resolveSolanaRpcUrl();
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: { message: text.slice(0, 200), code: res.status } };
    }
    return { status: res.status, json };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      status: 502,
      json: {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: `Upstream RPC failed: ${msg}` },
      },
    };
  }
}
