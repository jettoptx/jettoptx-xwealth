/**
 * Client-side JTX ownership proof (Phantom / window.solana).
 * Used for proven-mode routes: x402 settle, mojo sign/broadcast.
 */

import { resolveClientWallet } from "@/lib/jtx-api";

const PREFIX = "jOSH-X-Wealth-v0.1";
const BUCKET_MS = 300_000;

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i]! << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let zeros = 0;
  for (const b of bytes) {
    if (b === 0) zeros++;
    else break;
  }
  return (
    "1".repeat(zeros) +
    digits
      .reverse()
      .map((d) => BASE58_ALPHABET[d]!)
      .join("")
  );
}

export function jtxProofMessage(wallet: string): string {
  const bucket = Math.floor(Date.now() / BUCKET_MS);
  return `${PREFIX}:${wallet}:${bucket}`;
}

type SolanaProvider = {
  publicKey?: { toBase58(): string; toBytes(): Uint8Array };
  signMessage?(
    message: Uint8Array,
    display?: string,
  ): Promise<Uint8Array | { signature: Uint8Array }>;
};

function phantom(): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { solana?: SolanaProvider & { isPhantom?: boolean } };
  return w.solana ?? null;
}

export type JtxProofHeaders = {
  "X-Solana-Wallet": string;
  "X-JTX-Proof": string;
  "X-JTX-Message": string;
};

/**
 * Build ownership proof headers. Requires Phantom (or compatible) if signing.
 * Returns null when no signer is available.
 */
export async function buildJtxProofHeaders(
  walletHint?: string,
): Promise<JtxProofHeaders | null> {
  const provider = phantom();
  const connected = provider?.publicKey?.toBase58?.();
  const wallet = (connected || resolveClientWallet(walletHint)).trim();
  if (!wallet || !provider?.signMessage) return null;

  const message = jtxProofMessage(wallet);
  const encoded = new TextEncoder().encode(message);
  const raw = await provider.signMessage(encoded, "utf8");
  const sigBytes = raw instanceof Uint8Array ? raw : raw.signature;
  return {
    "X-Solana-Wallet": wallet,
    "X-JTX-Proof": base58Encode(sigBytes),
    "X-JTX-Message": message,
  };
}
