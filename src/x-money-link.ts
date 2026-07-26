/**
 * X Money pay / transfer link helpers (plugin + agent harness).
 * QR / share payloads seen in the wild:
 *   https://x.com/i/money/transfer/{handle}
 *   https://x.com/i/money/pay/{handle}   â† receive QR (e.g. demo_user)
 */

const MONEY_PATH_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/i\/money\/(transfer|pay)\/([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/i;

export type MoneyLinkKind = "pay" | "transfer";

export type MoneyLinkResolve = {
  ok: boolean;
  handle: string | null;
  transferUrl: string | null;
  kind: MoneyLinkKind | null;
  raw: string;
  method: "paste" | "qr_lib" | "unknown";
  isXMoney: boolean;
  note?: string;
};

function canonicalUrl(kind: MoneyLinkKind, handle: string): string {
  return `https://x.com/i/money/${kind}/${handle}`;
}

/**
 * Parse bare handle or X Money pay/transfer URL into a normalized intent shape.
 * Pure â€” no network, no wallet, no SpacetimeDB.
 */
export function parseMoneyLink(
  raw: string,
  method: MoneyLinkResolve["method"] = "unknown",
): MoneyLinkResolve {
  const text = String(raw ?? "").trim();
  if (!text) {
    return {
      ok: false,
      handle: null,
      transferUrl: null,
      kind: null,
      raw: text,
      method,
      isXMoney: false,
      note: "Empty payload",
    };
  }

  // Bare handle â†’ transfer shape (payout intent default)
  if (/^@?[A-Za-z0-9_]{1,15}$/.test(text)) {
    const handle = text.replace(/^@/, "");
    return {
      ok: true,
      handle,
      transferUrl: canonicalUrl("transfer", handle),
      kind: "transfer",
      raw: text,
      method,
      isXMoney: true,
      note: "Interpreted as X handle",
    };
  }

  const m = text.match(MONEY_PATH_RE);
  if (m) {
    const kind = m[1].toLowerCase() as MoneyLinkKind;
    const handle = m[2];
    return {
      ok: true,
      handle,
      transferUrl: canonicalUrl(kind, handle),
      kind,
      raw: text,
      method,
      isXMoney: true,
      note:
        kind === "pay"
          ? "X Money pay/receive QR"
          : "X Money transfer link",
    };
  }

  if (/^https?:\/\//i.test(text)) {
    return {
      ok: false,
      handle: null,
      transferUrl: null,
      kind: null,
      raw: text,
      method,
      isXMoney: false,
      note: "URL is not an X Money transfer/pay link",
    };
  }

  return {
    ok: false,
    handle: null,
    transferUrl: null,
    kind: null,
    raw: text,
    method,
    isXMoney: false,
    note: "Could not parse as X Money transfer/pay",
  };
}

/** Dry-run payout intent â€” no settle, no STDB required. */
export function buildDryRunIntent(
  link: MoneyLinkResolve,
  opts?: { amountUsd?: number; fromWallet?: string },
): Record<string, unknown> {
  return {
    ok: !!link.ok,
    mode: "dry-run",
    live: false,
    settle: false,
    handle: link.handle,
    transferUrl: link.transferUrl,
    kind: link.kind,
    method: link.method,
    amountUsd: opts?.amountUsd ?? null,
    asset: "USDC",
    fromWallet: opts?.fromWallet ?? null,
    note: "Augment-08 beta dry-run â€” no USDC moved; SpacetimeDB not required",
  };
}
