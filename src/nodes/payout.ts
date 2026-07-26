/**
 * Graph node definition for X Money payout
 * Compatible with Hermes / OpenClaw style agent graphs
 *
 * Live settle is NOT implemented. Dry-run only until operator LIVE + signer.
 * SpacetimeDB is optional later â€” not required for this node.
 */

import { parseMoneyLink } from "../x-money-link.js";

export interface PayoutNodeConfig {
  recipientHandle: string;
  amount: number;
  currency?: "USD" | "SOL" | "JTX" | "USDC";
  /** e.g. https://x.com/i/money/pay/demo_user or /transfer/â€¦ */
  transferLink?: string;
}

export function createPayoutNode(config: PayoutNodeConfig) {
  const fromLink = config.transferLink
    ? parseMoneyLink(config.transferLink, "paste")
    : null;
  const handle =
    fromLink?.handle || config.recipientHandle.replace(/^@/, "");

  return {
    name: "xwealth.payout",
    description:
      "Dry-run X Money payout intent after JTX gate (LIVE not shipped)",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number" },
        recipientHandle: { type: "string" },
        transferLink: { type: "string" },
      },
      required: ["amount", "recipientHandle"],
    },
    async execute(input: { amount?: number; recipientHandle?: string }) {
      const amount = input?.amount ?? config.amount;
      const recipientHandle = (
        input?.recipientHandle ||
        handle ||
        ""
      ).replace(/^@/, "");
      const link = parseMoneyLink(
        config.transferLink || recipientHandle,
        config.transferLink ? "paste" : "unknown",
      );
      return {
        status: "dry-run",
        mode: "dry-run",
        live: false,
        settle: false,
        txId: null,
        recipientHandle,
        amount,
        currency: config.currency || "USDC",
        transferUrl: link.transferUrl,
        kind: link.kind,
        note: "LIVE send requires explicit operator LIVE + local signer â€” no SpacetimeDB required for dry-run",
      };
    },
  };
}
