/**
 * Solana ed25519 ownership proof for expensive JTX-gated routes.
 * Message: `jOSH-X-Wealth-v0.1:${wallet}:${bucket}` (bucket = floor(ms/300000))
 * Signature: base58 ed25519 detached sig over UTF-8 message bytes.
 */

import { createPublicKey, verify } from "node:crypto";

const PREFIX = "jOSH-X-Wealth-v0.1";
const BUCKET_MS = 300_000;
const MAX_SKEW = 2;

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function jtxProofMessage(wallet: string, bucket?: number): string {
  const b =
    bucket ?? Math.floor(Date.now() / BUCKET_MS);
  return `${PREFIX}:${wallet}:${b}`;
}

export function currentProofBucket(): number {
  return Math.floor(Date.now() / BUCKET_MS);
}

/** Minimal base58 → bytes (Solana sig / pubkey). */
export function base58Decode(str: string): Uint8Array | null {
  try {
    const bytes: number[] = [0];
    for (const c of str) {
      const val = BASE58_ALPHABET.indexOf(c);
      if (val < 0) return null;
      let carry = val;
      for (let i = 0; i < bytes.length; i++) {
        carry += bytes[i]! * 58;
        bytes[i] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    let zeros = 0;
    for (const c of str) {
      if (c === "1") zeros++;
      else break;
    }
    const out = new Uint8Array(zeros + bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      out[out.length - 1 - i] = bytes[i]!;
    }
    return out;
  } catch {
    return null;
  }
}

function verifyEd25519(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  if (publicKey.length !== 32 || signature.length !== 64) return false;
  try {
    const keyObject = createPublicKey({
      format: "jwk",
      key: {
        kty: "OKP",
        crv: "Ed25519",
        x: Buffer.from(publicKey).toString("base64url"),
      },
    });
    return verify(null, message, keyObject, signature);
  } catch {
    return false;
  }
}

/**
 * Verify wallet owns the key that signed a recent proof bucket message.
 */
export function verifyJtxOwnershipProof(opts: {
  wallet: string;
  signatureBase58: string;
  message?: string;
}): { ok: true } | { ok: false; error: string } {
  const wallet = opts.wallet.trim();
  if (!wallet || wallet.length < 32) {
    return { ok: false, error: "Invalid wallet for ownership proof" };
  }

  const pubkey = base58Decode(wallet);
  if (!pubkey || pubkey.length !== 32) {
    return { ok: false, error: "Wallet is not a valid Solana pubkey" };
  }

  const sig = base58Decode(opts.signatureBase58.trim());
  if (!sig || sig.length !== 64) {
    return { ok: false, error: "Invalid ownership signature encoding" };
  }

  const bucket = currentProofBucket();
  const candidates: string[] = [];
  if (opts.message?.trim()) candidates.push(opts.message.trim());
  for (let i = 0; i <= MAX_SKEW; i++) {
    candidates.push(jtxProofMessage(wallet, bucket - i));
  }

  const seen = new Set<string>();
  for (const msg of candidates) {
    if (seen.has(msg)) continue;
    seen.add(msg);
    const bytes = new TextEncoder().encode(msg);
    if (verifyEd25519(bytes, sig, pubkey)) {
      return { ok: true };
    }
  }

  return {
    ok: false,
    error:
      "Ownership proof failed — sign jOSH-X-Wealth-v0.1:<wallet>:<bucket> with this wallet",
  };
}
