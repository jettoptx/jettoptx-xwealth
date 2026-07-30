/**
 * NOTR relay interface — Buzz-style Space Cowboys channel (jettoptx.chat).
 *
 * Public proofs stay local (Zustand) for Map of Augments v1.
 * Private delegate payloads are stubbed until Buzz/Nostr wiring.
 *
 * @see docs/MOA-GRAPH.md
 * @see https://www.jettoptx.chat/send?c=2
 */

import {
  makeLinkId,
  makeProofId,
  normalizeHandle,
  type MoaLink,
  type MoaPublicProof,
} from "./moa-graph";
import { useWealthStore } from "./store";
import { X402_ASSET, X402_NETWORK } from "./x402";

export type DelegatePrivatePayload = {
  fromHandle: string;
  toHandle: string;
  amountFull?: string;
  memo?: string;
  x402ReceiptId: string;
};

export type ProofPublicEvent = {
  payerHandle: string;
  payeeHandle: string;
  asset: "USDC";
  settledAt: string;
  txOrIntentId: string;
  amountPublic: string | null;
  harness?: string;
  notePublic?: string;
};

/**
 * Private delegate path — amount stays off the public map.
 * TODO: wire to Buzz / NOTR relay at jettoptx.chat Space Cowboys channel.
 */
export async function publishDelegatePrivate(
  payload: DelegatePrivatePayload,
): Promise<void> {
  // Stub: log only. Do not put amountFull into moaProofs.
  if (typeof console !== "undefined") {
    console.info("[notr] delegate private (stub → Buzz later)", {
      from: payload.fromHandle,
      to: payload.toHandle,
      receipt: payload.x402ReceiptId,
      memo: payload.memo,
      // amount intentionally omitted from public surfaces
      hasAmount: Boolean(payload.amountFull),
    });
  }

  const from = normalizeHandle(payload.fromHandle);
  const to = normalizeHandle(payload.toHandle);
  const link: MoaLink = {
    id: makeLinkId(from, to, "delegate"),
    fromHandle: from,
    toHandle: to,
    kind: "delegate",
    createdAt: new Date().toISOString(),
  };
  useWealthStore.getState().upsertMoaLink(link);
}

/**
 * Public proof path — edge visible, amount truncated unless amountPublic set.
 * Writes MoaPublicProof + paid MoaLink into Zustand.
 */
export async function publishProofPublic(
  event: ProofPublicEvent,
): Promise<MoaPublicProof> {
  const payer = normalizeHandle(event.payerHandle);
  const payee = normalizeHandle(event.payeeHandle);
  const proof: MoaPublicProof = {
    id: makeProofId(),
    payerHandle: payer,
    payeeHandle: payee,
    asset: event.asset ?? X402_ASSET,
    network: X402_NETWORK,
    amountPublic: event.amountPublic ?? null,
    amountPrivateRef:
      event.amountPublic == null ? `priv_${event.txOrIntentId}` : undefined,
    txOrIntentId: event.txOrIntentId,
    harness: event.harness,
    settledAt: event.settledAt,
    visibility: event.amountPublic ? "public_full" : "public_edge",
    notePublic:
      event.notePublic ?? "Space Cowboy paid agent via X Wealth x402",
  };

  const link: MoaLink = {
    id: makeLinkId(payer, payee, "paid"),
    fromHandle: payer,
    toHandle: payee,
    kind: "paid",
    createdAt: event.settledAt,
    proofId: proof.id,
  };

  useWealthStore.getState().recordMoaProof(proof, link);
  return proof;
}

/** Local follow / link edge (no amount). */
export function linkFollowLocal(fromHandle: string, toHandle: string): MoaLink {
  const from = normalizeHandle(fromHandle);
  const to = normalizeHandle(toHandle);
  const link: MoaLink = {
    id: makeLinkId(from, to, "follow"),
    fromHandle: from,
    toHandle: to,
    kind: "follow",
    createdAt: new Date().toISOString(),
  };
  useWealthStore.getState().upsertMoaLink(link);
  return link;
}
