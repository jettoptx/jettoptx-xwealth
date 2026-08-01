/**
 * Solana USDC payTo helpers for Mojo sign_tx (no full tx build — phone builds).
 */

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** True when string looks like a Solana base58 pubkey (not an https URL). */
export function looksLikeSolanaPubkey(s: string | null | undefined): boolean {
  const v = (s || "").trim();
  if (!v || v.includes("://") || v.includes("/")) return false;
  return BASE58_RE.test(v);
}

/** Prefer explicit destination; else payTo when it is a pubkey. */
export function resolveSolanaPayTo(opts: {
  destination?: string | null;
  payTo?: string | null;
}): string | null {
  if (looksLikeSolanaPubkey(opts.destination)) return opts.destination!.trim();
  if (looksLikeSolanaPubkey(opts.payTo)) return opts.payTo!.trim();
  return null;
}

export async function broadcastMojoSignedTx(
  signedTxBase64: string,
): Promise<
  | { ok: true; signature: string; explorer?: string; rpc?: string }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/mojo/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedTx: signedTxBase64 }),
  });
  const d = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    signature?: string;
    explorer?: string;
    rpc?: string;
    error?: string;
  };
  if (!res.ok || !d.ok || !d.signature) {
    return { ok: false, error: d.error || `broadcast failed (${res.status})` };
  }
  return {
    ok: true,
    signature: d.signature,
    explorer: d.explorer,
    rpc: d.rpc,
  };
}
