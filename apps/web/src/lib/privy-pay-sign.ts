/**
 * Privy-backed payment signature for x402 LIVE intents.
 * Signs a canonical payment message with the user's wallet, then the UI
 * opens X Money in a new window for "Pay now".
 */

export type PrivySignResult = {
  signature: string;
  from: string;
  method: "privy-evm" | "privy-prompt";
};

/** Canonical message agents / wallets sign for an x402 live intent. */
export function buildX402SignMessage(opts: {
  amountUsdc: string;
  xHandle: string;
  xMoneyUrl: string;
  resource: string;
  network?: string;
  asset?: string;
}): string {
  const lines = [
    "X Wealth x402 LIVE intent",
    `amount: ${opts.amountUsdc} ${opts.asset ?? "USDC"}`,
    `network: ${opts.network ?? "solana-mainnet"}`,
    `payTo: ${opts.xMoneyUrl}`,
    `xHandle: @${opts.xHandle}`,
    `resource: ${opts.resource}`,
    `ts: ${new Date().toISOString()}`,
  ];
  return lines.join("\n");
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
