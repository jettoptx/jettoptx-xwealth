/**
 * Map of Augments (MoA) — graph model for X Wealth.
 * Privacy default: edge public, amount private (product truncation).
 *
 * Infra direction (do not wire keys client-side):
 * - Helius = primary Solana RPC
 * - Light Protocol = compression / privacy (via Helius)
 * - QuickNode = optional failover only
 * - Token-2022 confidential / Zama FHE = later
 */

import { AUGMENT_SEED } from "./augments";
import { X402_ASSET, X402_NETWORK } from "./x402";

export type MoaNode = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  payUrl: string;
  defaultAmount: string;
  asset: "USDC";
  network: "solana-mainnet";
  harnesses: string[];
  tags: string[];
  featured?: boolean;
};

export type MoaLinkKind = "follow" | "delegate" | "paid";

export type MoaLink = {
  id: string;
  fromHandle: string;
  toHandle: string;
  kind: MoaLinkKind;
  mutual?: boolean;
  createdAt: string;
  proofId?: string;
};

export type MoaPublicProof = {
  id: string;
  payerHandle: string;
  payeeHandle: string;
  asset: "USDC";
  network: "solana-mainnet";
  /** null = truncated / hidden on the public map */
  amountPublic?: string | null;
  amountPrivateRef?: string;
  txOrIntentId: string;
  harness?: string;
  settledAt: string;
  visibility: "public_edge" | "public_full" | "private";
  notePublic?: string;
};

/** Layout hint for SVG map (0–1 normalized). */
export type MoaNodeLayout = {
  handle: string;
  x: number;
  y: number;
};

const SEED_AT = "2026-07-01T18:00:00.000Z";

/** Seed demo edges around @jettoptx (Space Cowboys hub). */
export const MOA_SEED_LINKS: MoaLink[] = [
  {
    id: "lnk_seed_follow_jett_xai",
    fromHandle: "jettoptx",
    toHandle: "xai",
    kind: "follow",
    mutual: true,
    createdAt: SEED_AT,
  },
  {
    id: "lnk_seed_follow_jett_grok",
    fromHandle: "jettoptx",
    toHandle: "grok",
    kind: "follow",
    createdAt: SEED_AT,
  },
  {
    id: "lnk_seed_follow_nous_jett",
    fromHandle: "NousResearch",
    toHandle: "jettoptx",
    kind: "follow",
    createdAt: SEED_AT,
  },
  {
    id: "lnk_seed_delegate_jett_solana",
    fromHandle: "jettoptx",
    toHandle: "solana",
    kind: "delegate",
    createdAt: SEED_AT,
  },
  {
    id: "lnk_seed_paid_xai_jett",
    fromHandle: "xai",
    toHandle: "jettoptx",
    kind: "paid",
    createdAt: "2026-07-28T16:22:00.000Z",
    proofId: "prf_seed_xai_jett",
  },
  {
    id: "lnk_seed_paid_grok_jett",
    fromHandle: "grok",
    toHandle: "jettoptx",
    kind: "paid",
    createdAt: "2026-07-29T09:10:00.000Z",
    proofId: "prf_seed_grok_jett",
  },
  {
    id: "lnk_seed_paid_astro_jett",
    fromHandle: "astroknots",
    toHandle: "jettoptx",
    kind: "paid",
    createdAt: "2026-07-29T21:05:00.000Z",
    proofId: "prf_seed_astro_jett",
  },
  {
    id: "lnk_seed_follow_dev_jett",
    fromHandle: "XDevelopers",
    toHandle: "jettoptx",
    kind: "follow",
    createdAt: SEED_AT,
  },
];

export const MOA_SEED_PROOFS: MoaPublicProof[] = [
  {
    id: "prf_seed_xai_jett",
    payerHandle: "xai",
    payeeHandle: "jettoptx",
    asset: X402_ASSET,
    network: X402_NETWORK,
    amountPublic: null,
    amountPrivateRef: "seed_amt_xai",
    txOrIntentId: "dry_seed_xai_jett_01",
    harness: "grok-build",
    settledAt: "2026-07-28T16:22:00.000Z",
    visibility: "public_edge",
    notePublic: "Space Cowboy paid agent via X Wealth x402",
  },
  {
    id: "prf_seed_grok_jett",
    payerHandle: "grok",
    payeeHandle: "jettoptx",
    asset: X402_ASSET,
    network: X402_NETWORK,
    amountPublic: null,
    amountPrivateRef: "seed_amt_grok",
    txOrIntentId: "dry_seed_grok_jett_01",
    harness: "grok-build",
    settledAt: "2026-07-29T09:10:00.000Z",
    visibility: "public_edge",
    notePublic: "Space Cowboy paid agent via X Wealth x402",
  },
  {
    id: "prf_seed_astro_jett",
    payerHandle: "astroknots",
    payeeHandle: "jettoptx",
    asset: X402_ASSET,
    network: X402_NETWORK,
    amountPublic: null,
    amountPrivateRef: "seed_amt_astro",
    txOrIntentId: "dry_seed_astro_jett_01",
    harness: "claude",
    settledAt: "2026-07-29T21:05:00.000Z",
    visibility: "public_edge",
    notePublic: "Space Cowboy paid agent via X Wealth x402",
  },
];

/** Fixed SVG positions — hub @jettoptx, no force-graph. */
export const MOA_NODE_LAYOUT: MoaNodeLayout[] = [
  { handle: "jettoptx", x: 0.5, y: 0.48 },
  { handle: "xai", x: 0.22, y: 0.22 },
  { handle: "grok", x: 0.78, y: 0.2 },
  { handle: "solana", x: 0.18, y: 0.72 },
  { handle: "NousResearch", x: 0.82, y: 0.7 },
  { handle: "astroknots", x: 0.35, y: 0.18 },
  { handle: "XDevelopers", x: 0.65, y: 0.82 },
  { handle: "elonmusk", x: 0.12, y: 0.45 },
  { handle: "circle", x: 0.88, y: 0.45 },
  { handle: "phantom", x: 0.5, y: 0.12 },
  { handle: "AnthropicAI", x: 0.5, y: 0.88 },
  { handle: "a16zcrypto", x: 0.28, y: 0.88 },
];

export function listingToMoaNode(
  listing: (typeof AUGMENT_SEED)[number],
): MoaNode {
  return {
    id: listing.id,
    handle: listing.handle,
    displayName: listing.displayName,
    avatarUrl: listing.avatarUrl ?? undefined,
    payUrl: listing.payUrl,
    defaultAmount: listing.defaultAmount ?? "0.10",
    asset: "USDC",
    network: "solana-mainnet",
    harnesses: listing.harnesses,
    tags: listing.tags,
    featured: listing.featured,
  };
}

export function seedMoaNodes(): MoaNode[] {
  return AUGMENT_SEED.map(listingToMoaNode);
}

export function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

export function linkIsHot(kind: MoaLinkKind): boolean {
  return kind === "paid" || kind === "delegate";
}

export function formatProofStrip(proof: MoaPublicProof): string {
  const when = new Date(proof.settledAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const harness = proof.harness ? ` · ${proof.harness}` : "";
  const amt =
    proof.amountPublic != null && proof.amountPublic !== ""
      ? ` · ${proof.amountPublic} ${proof.asset}`
      : ` · ${proof.asset}`;
  return `@${proof.payerHandle} → @${proof.payeeHandle}${harness}${amt} · ${when}`;
}

export function formatProofShareLine(proof: MoaPublicProof): string {
  return (
    `Space Cowboy proof · @${proof.payerHandle} → @${proof.payeeHandle} ` +
    `paid agent via X Wealth x402 · https://xwealth.space/augments`
  );
}

export function makeProofId(): string {
  return `prf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeLinkId(from: string, to: string, kind: MoaLinkKind): string {
  return `lnk_${kind}_${normalizeHandle(from)}_${normalizeHandle(to)}`;
}

export function proofsForHandle(
  proofs: MoaPublicProof[],
  handle: string,
): MoaPublicProof[] {
  const h = normalizeHandle(handle);
  return proofs
    .filter(
      (p) =>
        p.visibility !== "private" &&
        (normalizeHandle(p.payeeHandle) === h ||
          normalizeHandle(p.payerHandle) === h),
    )
    .sort(
      (a, b) =>
        new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime(),
    );
}
