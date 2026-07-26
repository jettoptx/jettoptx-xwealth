/**
 * Local signer adapter — loads Solana keypair from disk/env path only.
 * NEVER logs or returns secret key bytes.
 * Not required for dry-run; required later for LIVE (still blocked until settle).
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Keypair } from "@solana/web3.js";

export type SignerPublicInfo = {
  present: boolean;
  pubkey: string | null;
  source: string | null;
  /** Absolute path used (for operator debugging — never contains secret) */
  path: string | null;
  error?: string;
};

function defaultCandidates(): string[] {
  return [
    process.env.XWEALTH_KEYPAIR?.trim(),
    process.env.SOLANA_KEYPAIR?.trim(),
    process.env.SOLANA_KEYPAIR_PATH?.trim(),
    join(homedir(), ".config", "solana", "id.json"),
  ].filter(Boolean) as string[];
}

function resolveKeypairPath(explicit?: string): {
  path: string | null;
  source: string | null;
} {
  if (explicit?.trim()) {
    return { path: explicit.trim(), source: "explicit" };
  }
  for (const p of defaultCandidates()) {
    if (existsSync(p)) {
      const source = process.env.XWEALTH_KEYPAIR
        ? "XWEALTH_KEYPAIR"
        : process.env.SOLANA_KEYPAIR || process.env.SOLANA_KEYPAIR_PATH
          ? "SOLANA_KEYPAIR"
          : "default ~/.config/solana/id.json";
      return { path: p, source };
    }
  }
  return { path: null, source: null };
}

/**
 * Load keypair from JSON byte array (solana-keygen style).
 */
export function inspectSigner(explicitPath?: string): SignerPublicInfo {
  const { path, source } = resolveKeypairPath(explicitPath);
  if (!path) {
    return {
      present: false,
      pubkey: null,
      source: null,
      path: null,
      error:
        "No keypair path. Set XWEALTH_KEYPAIR=/path/to/id.json (gitignored). Dry-run works without it.",
    };
  }
  if (!existsSync(path)) {
    return {
      present: false,
      pubkey: null,
      source: source,
      path,
      error: `Keypair file not found: ${path}`,
    };
  }
  try {
    const kp = loadKeypairFromFile(path);
    return {
      present: true,
      pubkey: kp.publicKey.toBase58(),
      source,
      path,
    };
  } catch (e) {
    return {
      present: false,
      pubkey: null,
      source,
      path,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Load Keypair for future LIVE signing — do not serialize / log secret. */
export function loadKeypairFromFile(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8")) as
    | number[]
    | { secretKey?: number[]; privateKey?: number[] | string };

  let secret: Uint8Array;
  if (Array.isArray(raw)) {
    secret = Uint8Array.from(raw);
  } else if (Array.isArray(raw.secretKey)) {
    secret = Uint8Array.from(raw.secretKey);
  } else if (Array.isArray(raw.privateKey)) {
    secret = Uint8Array.from(raw.privateKey);
  } else {
    throw new Error(
      "Unsupported keypair JSON (expect solana-keygen byte array)",
    );
  }
  if (secret.length < 32) {
    throw new Error("Keypair secret too short");
  }
  return Keypair.fromSecretKey(secret);
}

/**
 * Public-only snapshot for intents / logs.
 * Callers must never attach secret material to intents.
 */
export function signerSnapshot(explicitPath?: string): SignerPublicInfo {
  return inspectSigner(explicitPath);
}
