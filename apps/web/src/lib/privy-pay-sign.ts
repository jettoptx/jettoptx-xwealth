/**
 * Privy-backed payment signature for x402 LIVE intents.
 * Signs a canonical payment message with the user's Solana wallet, then the UI
 * opens X Money in a new window for "Pay now".
 */

export type PrivySignResult = {
  signature: string;
  from: string;
  method: "privy-solana" | "privy-evm" | "privy-prompt";
};

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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

/** Encode Solana ed25519 signature bytes as base58 (matches JTX proof rail). */
export function bytesToBase58(bytes: Uint8Array): string {
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

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
