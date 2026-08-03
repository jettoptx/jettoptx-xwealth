/**
 * In-memory per-wallet rate limit for balance-only JTX gates.
 * Deters free-riding / RPC abuse until ownership sessions are universal.
 */

type Entry = { count: number; resetAt: number };

const hits = new Map<string, Entry>();

const WINDOW_MS = 5 * 60 * 1000;
const MAX_HITS = 60;

export function jtxRateLimitAllow(
  key: string,
  opts?: { max?: number; windowMs?: number },
): { ok: true } | { ok: false; retryAfterSec: number } {
  const max = opts?.max ?? MAX_HITS;
  const windowMs = opts?.windowMs ?? WINDOW_MS;
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now >= cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
    };
  }
  cur.count += 1;
  return { ok: true };
}
