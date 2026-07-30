/**
 * x402-style payment envelopes for agent harnesses.
 * Protocol shape follows Coinbase x402 (HTTP 402 + payment headers).
 * Modes: dry-run (default) | live intent (REAL — opens X Money; facilitator optional).
 */

export const X402_NETWORK = "solana-mainnet" as const;
export const X402_ASSET = "USDC" as const;
/** Circle USDC mint on Solana mainnet */
export const USDC_MINT_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export type X402Accepts = {
  scheme: "exact";
  network: typeof X402_NETWORK;
  maxAmountRequired: string;
  asset: typeof X402_ASSET;
  mint: string;
  payTo: string;
  resource: string;
  description: string;
  mimeType: string;
  outputSchema: null;
  extra: {
    name: string;
    version: string;
    destination: "x-money";
    xHandle: string;
    xMoneyUrl: string;
  };
};

export type X402PaymentRequired = {
  x402Version: 1;
  accepts: X402Accepts[];
  error?: string;
};

export type X402PaymentPayload = {
  x402Version: 1;
  scheme: "exact";
  network: typeof X402_NETWORK;
  payload: {
    signature: string;
    amount: string;
    asset: typeof X402_ASSET;
    mint: string;
    from: string;
    to: string;
    resource: string;
    timestamp: string;
    dryRun: boolean;
  };
};

export type X402SettleResult = {
  success: true;
  dryRun: boolean;
  live?: boolean;
  transaction: string;
  network: typeof X402_NETWORK;
  amount: string;
  asset: typeof X402_ASSET;
  payTo: string;
  xHandle: string;
  settledAt: string;
  note: string;
  /** When live and no on-chain facilitator — operator completes on X */
  actionUrl?: string;
};

export function buildPaymentRequired(opts: {
  amountUsdc: string;
  xHandle: string;
  xMoneyUrl: string;
  resource: string;
  description?: string;
}): X402PaymentRequired {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: X402_NETWORK,
        maxAmountRequired: opts.amountUsdc,
        asset: X402_ASSET,
        mint: USDC_MINT_SOLANA,
        payTo: opts.xMoneyUrl,
        resource: opts.resource,
        description:
          opts.description ??
          `Pay @${opts.xHandle} via X Money (USDC / Solana / x402)`,
        mimeType: "application/json",
        outputSchema: null,
        extra: {
          name: "X Wealth / Jett Optical Encryption",
          version: "1.0.0",
          destination: "x-money",
          xHandle: opts.xHandle,
          xMoneyUrl: opts.xMoneyUrl,
        },
      },
    ],
  };
}

/** Unicode-safe base64 (works in browser + Node). */
export function utf8ToBase64(text: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodePaymentRequired(body: X402PaymentRequired): string {
  return utf8ToBase64(JSON.stringify(body));
}

export function decodePaymentRequired(header: string): X402PaymentRequired {
  return JSON.parse(base64ToUtf8(header)) as X402PaymentRequired;
}

export function buildPaymentPayload(opts: {
  amountUsdc: string;
  xHandle: string;
  xMoneyUrl: string;
  resource: string;
  fromWallet?: string;
  dryRun: boolean;
}): X402PaymentPayload {
  const prefix = opts.dryRun ? "dry_" : "live_";
  const sig = `${prefix}${cryptoRandom(24)}`;
  return {
    x402Version: 1,
    scheme: "exact",
    network: X402_NETWORK,
    payload: {
      signature: sig,
      amount: opts.amountUsdc,
      asset: X402_ASSET,
      mint: USDC_MINT_SOLANA,
      from: opts.fromWallet ?? (opts.dryRun ? "agent-harness-sim" : "agent-harness-live"),
      to: opts.xMoneyUrl,
      resource: opts.resource,
      timestamp: new Date().toISOString(),
      dryRun: opts.dryRun,
    },
  };
}

/** @deprecated use buildPaymentPayload({ dryRun: true }) */
export function buildDryRunPayload(opts: {
  amountUsdc: string;
  xHandle: string;
  xMoneyUrl: string;
  resource: string;
  fromWallet?: string;
}): X402PaymentPayload {
  return buildPaymentPayload({ ...opts, dryRun: true });
}

export function encodePaymentSignature(payload: X402PaymentPayload): string {
  return utf8ToBase64(JSON.stringify(payload));
}

export function settlePayment(
  required: X402PaymentRequired,
  signedHeader: string,
  opts?: { allowLive?: boolean },
): X402SettleResult | { success: false; error: string } {
  let payload: X402PaymentPayload;
  try {
    payload = JSON.parse(base64ToUtf8(signedHeader)) as X402PaymentPayload;
  } catch {
    return { success: false, error: "Invalid PAYMENT-SIGNATURE header" };
  }

  const accept = required.accepts[0];
  if (!accept) return { success: false, error: "No payment options" };
  if (payload.payload.amount !== accept.maxAmountRequired) {
    return { success: false, error: "Amount mismatch" };
  }
  if (payload.payload.asset !== accept.asset) {
    return { success: false, error: "Asset mismatch" };
  }

  const isDry = payload.payload.dryRun !== false;
  if (!isDry && !opts?.allowLive) {
    return {
      success: false,
      error: "Live settle not enabled — set X402_LIVE_ENABLED=true or use dry-run",
    };
  }

  if (isDry) {
    return {
      success: true,
      dryRun: true,
      transaction: payload.payload.signature,
      network: X402_NETWORK,
      amount: payload.payload.amount,
      asset: X402_ASSET,
      payTo: accept.payTo,
      xHandle: accept.extra.xHandle,
      settledAt: new Date().toISOString(),
      note: "Dry-run only — no on-chain settlement. Ready for facilitator wiring.",
    };
  }

  // LIVE intent: real x402 envelope accepted; settlement = X Money pay surface
  // (facilitator can replace this when X402_FACILITATOR_URL is configured)
  return {
    success: true,
    dryRun: false,
    live: true,
    transaction: payload.payload.signature,
    network: X402_NETWORK,
    amount: payload.payload.amount,
    asset: X402_ASSET,
    payTo: accept.payTo,
    xHandle: accept.extra.xHandle,
    settledAt: new Date().toISOString(),
    actionUrl: accept.payTo,
    note:
      "LIVE intent recorded. Complete payment on X Money (USDC/Solana). On-chain facilitator not yet attached — pay link opened for operator.",
  };
}

/** @deprecated use settlePayment */
export function settleDryRun(
  required: X402PaymentRequired,
  signedHeader: string,
): X402SettleResult | { success: false; error: string } {
  return settlePayment(required, signedHeader, { allowLive: false });
}

function cryptoRandom(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
