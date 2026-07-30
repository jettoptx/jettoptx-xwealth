/** X Money pay / transfer link parsing and builders. */

export type XMoneyKind = "pay" | "transfer";

/**
 * How confident we are that X Money is actually set up for this handle.
 * We cannot call X's API from the client, so "confirmed" is user-attested.
 */
export type MoneySetupStatus =
  | "unlinked"
  | "linked_unverified"
  | "setup_needed"
  | "confirmed";

export type ParsedXMoney =
  | {
      ok: true;
      handle: string;
      kind: XMoneyKind;
      transferUrl: string;
      raw: string;
      method: "url" | "handle" | "qr";
      note?: string;
      /** Handle-only builds are more likely to need Money setup on X */
      likelyNeedsSetup: boolean;
    }
  | {
      ok: false;
      handle: null;
      transferUrl: null;
      kind: null;
      raw: string;
      method: "url" | "handle" | "qr";
      note: string;
      likelyNeedsSetup: false;
    };

const HANDLE_RE = /^@?([A-Za-z0-9_]{1,15})$/;
const MONEY_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/i\/money\/(pay|transfer)\/@?([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/i;
const PROFILE_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/i;

/** Official X Money home / setup entry (opens on X). */
export const X_MONEY_SETUP_URL = "https://x.com/i/money";

export function buildXMoneyUrl(kind: XMoneyKind, handle: string): string {
  const h = handle.replace(/^@/, "").toLowerCase();
  return `https://x.com/i/money/${kind}/${h}`;
}

export function normalizeHandle(input: string): string | null {
  const t = input.trim();
  const m = t.match(HANDLE_RE);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Infer an X handle from session fields. Display names like
 * "Space Cowboy Actual" are NOT valid handles — we try username, email local
 * part, then a slug of the display name as last resort.
 */
export function inferXHandle(parts: {
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string | null {
  // 1) Explicit @handle / screen name
  const fromUser =
    normalizeHandle(parts.username ?? "") ||
    normalizeHandle(parts.displayName ?? "");
  if (fromUser) return fromUser;

  // 2) Email local-part (broker may use handle@… or twitter_handle@…)
  if (parts.email) {
    const local = parts.email.split("@")[0] ?? "";
    const cleaned = local
      .replace(/^(twitter|x)[_-]?/i, "")
      .replace(/[^A-Za-z0-9_]/g, "");
    const h = normalizeHandle(cleaned);
    if (h && h.length >= 2 && !/^\d+$/.test(h)) return h;
  }

  // 3) Slug display name → handle-shaped token (best effort for OAuth name field)
  if (parts.displayName) {
    const slug = parts.displayName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9_]+/g, "")
      .slice(0, 15);
    if (slug.length >= 2) return slug.toLowerCase();
  }

  return null;
}

export function parseXMoneyInput(
  rawInput: string,
  method: ParsedXMoney["method"] = "url",
  preferredKind: XMoneyKind = "pay",
): ParsedXMoney {
  const raw = rawInput.trim();
  if (!raw) {
    return {
      ok: false,
      handle: null,
      transferUrl: null,
      kind: null,
      raw,
      method,
      note: "Paste an X Money pay/transfer link, QR payload, or @handle.",
      likelyNeedsSetup: false,
    };
  }

  const money = raw.match(MONEY_URL_RE);
  if (money) {
    const kind = money[1].toLowerCase() as XMoneyKind;
    const handle = money[2].toLowerCase();
    return {
      ok: true,
      handle,
      kind,
      transferUrl: buildXMoneyUrl(kind, handle),
      raw,
      method,
      note: kind === "pay" ? "X Money pay link" : "X Money transfer link",
      likelyNeedsSetup: method === "handle",
    };
  }

  const asHandle = normalizeHandle(raw);
  if (asHandle) {
    return {
      ok: true,
      handle: asHandle,
      kind: preferredKind,
      transferUrl: buildXMoneyUrl(preferredKind, asHandle),
      raw,
      method: "handle",
      note: `Built ${preferredKind} link from @handle — confirm Money is set up on X`,
      likelyNeedsSetup: true,
    };
  }

  // Display-name style paste → infer slug handle
  const inferred = inferXHandle({ displayName: raw });
  if (inferred && !raw.includes("/") && !raw.includes(".")) {
    return {
      ok: true,
      handle: inferred,
      kind: preferredKind,
      transferUrl: buildXMoneyUrl(preferredKind, inferred),
      raw,
      method: "handle",
      note: `Built ${preferredKind} link from display name → @${inferred} — confirm this is your real X handle`,
      likelyNeedsSetup: true,
    };
  }

  const profile = raw.match(PROFILE_RE);
  if (profile) {
    const handle = profile[1].toLowerCase();
    return {
      ok: true,
      handle,
      kind: preferredKind,
      transferUrl: buildXMoneyUrl(preferredKind, handle),
      raw,
      method,
      note: "Built X Money link from profile URL — confirm Money is set up on X",
      likelyNeedsSetup: true,
    };
  }

  return {
    ok: false,
    handle: null,
    transferUrl: null,
    kind: null,
    raw,
    method,
    note: "Not an X Money link. Use https://x.com/i/money/pay/{handle} or /transfer/{handle}.",
    likelyNeedsSetup: false,
  };
}

export function moneyStatusLabel(status: MoneySetupStatus): string {
  switch (status) {
    case "unlinked":
      return "Money unlinked";
    case "linked_unverified":
      return "Link saved · not verified on X";
    case "setup_needed":
      return "X Money setup needed";
    case "confirmed":
      return "Money ready";
  }
}
