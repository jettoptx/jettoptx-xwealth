/**
 * JOE envelope carried inside a Decimen optical transfer (after fountain assemble).
 *
 * UTF-8 JSON bytes. Small login challenges can still use a single static
 * jettmojo://auth QR; use optical stream when the payload is large (unsigned
 * Solana tx) or when the sender opts into fountain robustness.
 */

export type OpticalKind = "login" | "sign_tx" | "raw";

export type OpticalLoginChallenge = {
  cid: string;
  origin: string;
  exp: number;
};

export type OpticalSignTxChallenge = {
  cid: string;
  origin: string;
  exp: number;
  amount: string;
  asset?: string;
  mint?: string;
  payTo: string;
  destination?: string | null;
  network?: string;
  memo?: string | null;
  /** Base64 unsigned Solana tx — primary reason to use optical transfer. */
  unsignedTx?: string | null;
  message?: string | null;
  resource?: string | null;
};

export type OpticalEnvelope = {
  v: 1;
  kind: OpticalKind;
  /** Present when kind is login or sign_tx */
  challenge?: OpticalLoginChallenge | OpticalSignTxChallenge;
  /** Optional UTF-8 note / memo for kind=raw */
  note?: string;
};

export function encodeOpticalEnvelope(env: OpticalEnvelope): Uint8Array {
  const json = JSON.stringify(env);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(json);
  }
  // RN / Hermes fallback
  const escaped = unescape(encodeURIComponent(json));
  const out = new Uint8Array(escaped.length);
  for (let i = 0; i < escaped.length; i++) out[i] = escaped.charCodeAt(i);
  return out;
}

export function decodeOpticalEnvelope(bytes: Uint8Array): OpticalEnvelope | null {
  try {
    let json: string;
    if (typeof TextDecoder !== "undefined") {
      json = new TextDecoder().decode(bytes);
    } else {
      let s = "";
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
      json = decodeURIComponent(escape(s));
    }
    const j = JSON.parse(json) as OpticalEnvelope;
    if (j.v !== 1 || !j.kind) return null;
    return j;
  } catch {
    return null;
  }
}
