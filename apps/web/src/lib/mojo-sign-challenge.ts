/**
 * Mojo QR sign_tx challenge client for X Wealth (x402 / USDC spend).
 *
 * Mints via same-origin `/api/mojo/sign-challenge` → AARON.
 * Schema: jettoptx-aaron-router/docs/mojo-sign-tx-challenge.md
 *
 * Phone (MOJO) builds the USDC transfer when `unsignedTx` is omitted —
 * web must set `destination` / `payTo` to a Solana pubkey.
 * On verified: broadcast `result.signedTx` via `/api/mojo/broadcast` (Helius).
 */

import { USDC_MINT_SOLANA } from "@/lib/x402";

export type SignTxMeta = {
  amount: string;
  mint?: string;
  asset?: string;
  payTo: string;
  destination?: string | null;
  network?: string;
  memo?: string | null;
  unsignedTx?: string | null;
  message?: string | null;
  resource?: string | null;
};

export type SignChallenge = {
  cid: string;
  type: "sign_tx";
  origin: string;
  exp: number;
  expiresAt: number;
  qrPayload: string;
  tx?: SignTxMeta | null;
  degraded?: boolean;
};

export type SignChallengePoll = {
  status: "pending" | "scanned" | "verified" | "expired" | "unknown";
  cid: string;
  type?: string;
  result?: {
    signature: string;
    signedTx?: string | null;
    signer?: string | null;
  };
};

/** Mint a sign_tx challenge (used by MojoSignQrModal). */
export async function createSignChallenge(opts: {
  origin?: string;
  privyDid?: string | null;
  tx: SignTxMeta;
}): Promise<SignChallenge> {
  const origin = opts.origin || "xwealth";
  const tx: SignTxMeta = {
    mint: USDC_MINT_SOLANA,
    asset: "USDC",
    network: "solana-mainnet",
    ...opts.tx,
  };
  const res = await fetch("/api/mojo/sign-challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin,
      privy_did: opts.privyDid ?? null,
      tx,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `mint failed (${res.status})`);
  }
  const d = (await res.json()) as Record<string, unknown>;
  const cid = String(d.cid ?? "");
  const expSec =
    typeof d.exp === "number"
      ? d.exp
      : typeof d.expiresAt === "number"
        ? d.expiresAt > 1e12
          ? Math.floor(d.expiresAt / 1000)
          : d.expiresAt
        : Math.floor(Date.now() / 1000) + 300;
  const qrPayload =
    (typeof d.qrPayload === "string" && d.qrPayload) ||
    (typeof d.qr_payload === "string" && d.qr_payload) ||
    `jettmojo://sign?cid=${cid}&origin=${origin}&exp=${expSec}`;
  return {
    cid,
    type: "sign_tx",
    origin,
    exp: expSec,
    expiresAt: expSec * 1000,
    qrPayload,
    tx: (d.tx as SignTxMeta) ?? tx,
    degraded: Boolean(d.degraded),
  };
}

export async function pollSignChallenge(cid: string): Promise<SignChallengePoll> {
  const res = await fetch(
    `/api/mojo/sign-challenge?cid=${encodeURIComponent(cid)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return { status: "pending", cid };
  return (await res.json()) as SignChallengePoll;
}

/** Convenience alias used by agent harnesses. */
export const mintMojoSignChallenge = createSignChallenge;
export const pollMojoSignChallenge = pollSignChallenge;
