/**
 * X Money transfer / pay link helpers.
 * QR / share payloads seen in the wild:
 *   https://x.com/i/money/transfer/{handle}
 *   https://x.com/i/money/pay/{handle}   ← X Money receive QR (JoshuaJett et al.)
 */

const MONEY_PATH_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/i\/money\/(transfer|pay)\/([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/i

export type TransferResolve = {
  ok: boolean
  handle: string | null
  transferUrl: string | null
  /** Canonical path kind from payload: pay (receive QR) or transfer */
  kind: 'pay' | 'transfer' | null
  raw: string
  method: 'paste' | 'qr_lib' | 'unknown'
  isXMoney: boolean
  note?: string
}

function canonicalUrl(kind: 'pay' | 'transfer', handle: string) {
  return `https://x.com/i/money/${kind}/${handle}`
}

export function parseTransferPayload(
  raw: string,
  method: TransferResolve['method'] = 'unknown',
): TransferResolve {
  const text = raw.trim()
  if (!text) {
    return {
      ok: false,
      handle: null,
      transferUrl: null,
      kind: null,
      raw: text,
      method,
      isXMoney: false,
      note: 'Empty payload',
    }
  }

  // Bare handle → prefer transfer shape (payout intent); pay QR is URL-only
  if (/^@?[A-Za-z0-9_]{1,15}$/.test(text)) {
    const handle = text.replace(/^@/, '')
    const transferUrl = canonicalUrl('transfer', handle)
    return {
      ok: true,
      handle,
      transferUrl,
      kind: 'transfer',
      raw: text,
      method,
      isXMoney: true,
      note: 'Interpreted as X handle',
    }
  }

  // Full or partial URL — transfer OR pay
  const m = text.match(MONEY_PATH_RE)
  if (m) {
    const kind = m[1].toLowerCase() as 'pay' | 'transfer'
    const handle = m[2]
    return {
      ok: true,
      handle,
      transferUrl: canonicalUrl(kind, handle),
      kind,
      raw: text,
      method,
      isXMoney: true,
      note: kind === 'pay' ? 'X Money pay/receive QR' : 'X Money transfer link',
    }
  }

  // Any URL that isn't X Money
  if (/^https?:\/\//i.test(text)) {
    return {
      ok: false,
      handle: null,
      transferUrl: null,
      kind: null,
      raw: text,
      method,
      isXMoney: false,
      note: 'URL is not an X Money transfer/pay link',
    }
  }

  return {
    ok: false,
    handle: null,
    transferUrl: null,
    kind: null,
    raw: text,
    method,
    isXMoney: false,
    note: 'Could not parse as X Money transfer/pay',
  }
}

/**
 * Getting the share link from X's webapp:
 * - Easy: user copies “share / transfer” link or scans QR (QR usually encodes the same URL).
 * - Not easy without login/automation: no stable public API for “my money QR payload”.
 * Agent path: Hyperbrowser on a logged-in session, or user paste/upload only.
 */
