/**
 * Client helpers for JTX-gated API calls.
 * Attaches X-Solana-Wallet from the wealth store / env default.
 */

import { defaultWalletFromEnv } from "@/lib/jtxGate";
import { OPTX_LINKS } from "@/lib/optx-links";
import { useWealthStore } from "@/lib/store";

export const JTX_BUY_URL = OPTX_LINKS.jtxBuy;

export function resolveClientWallet(explicit?: string): string {
  const fromArg = explicit?.trim();
  if (fromArg) return fromArg;
  try {
    const fromStore = useWealthStore.getState().solanaWallet?.trim();
    if (fromStore) return fromStore;
  } catch {
    /* store unavailable */
  }
  return defaultWalletFromEnv();
}

export function jtxHeaders(
  init?: HeadersInit,
  wallet?: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (init) {
    const h = new Headers(init);
    h.forEach((v, k) => {
      out[k] = v;
    });
  }
  if (!out["Content-Type"] && !out["content-type"]) {
    out["Content-Type"] = "application/json";
  }
  const w = resolveClientWallet(wallet);
  if (w) out["X-Solana-Wallet"] = w;
  return out;
}

export type JtxGateErrorBody = {
  error?: string;
  message?: string;
  buyUrl?: string;
  uiAmount?: number;
  wallet?: string | null;
};

/** fetch() wrapper that sends the wallet header for gated POSTs. */
export async function jtxFetch(
  input: string,
  init?: RequestInit & { wallet?: string },
): Promise<Response> {
  const { wallet, headers, ...rest } = init ?? {};
  return fetch(input, {
    ...rest,
    headers: jtxHeaders(headers, wallet),
  });
}

export function jtxDeniedMessage(json: JtxGateErrorBody): string {
  const buy = json.buyUrl || JTX_BUY_URL;
  if (json.error === "jtx_required" || json.error === "jtx_rpc_failed") {
    return `${json.message ?? "Need ≥1 JTX"} — buy: ${buy}`;
  }
  return json.message || json.error || "Request failed";
}
