/**
 * JTX v2 balance gate — pure Solana RPC (no Privy).
 * Mint: JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe
 */

export const JTX_MINT_V2 =
  process.env.JTX_MINT || "JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe";

export const DEFAULT_RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.XWEALTH_RPC ||
  "https://api.mainnet-beta.solana.com";

export interface JtxGateResult {
  ok: boolean;
  wallet: string;
  mint: string;
  uiAmount: number;
  minRequired: number;
  rpc: string;
  message: string;
}

export async function checkJtxGate(
  walletAddress: string,
  opts: { rpcUrl?: string; mint?: string; minRequired?: number } = {},
): Promise<JtxGateResult> {
  const wallet = walletAddress.trim();
  const mint = opts.mint || JTX_MINT_V2;
  const rpc = opts.rpcUrl || DEFAULT_RPC;
  const minRequired = opts.minRequired ?? 1;

  if (!wallet || wallet.length < 32) {
    return {
      ok: false,
      wallet,
      mint,
      uiAmount: 0,
      minRequired,
      rpc,
      message: "Invalid Solana wallet pubkey",
    };
  }

  const res = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        wallet,
        { mint },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Solana RPC HTTP ${res.status} (${rpc})`);
  }

  const json = (await res.json()) as {
    error?: { message?: string };
    result?: {
      value?: Array<{
        account?: {
          data?: {
            parsed?: {
              info?: { tokenAmount?: { uiAmount?: number | null } };
            };
          };
        };
      }>;
    };
  };

  if (json.error) {
    throw new Error(json.error.message || "Solana RPC error");
  }

  let uiAmount = 0;
  for (const a of json.result?.value || []) {
    const ta = a.account?.data?.parsed?.info?.tokenAmount;
    if (ta?.uiAmount != null) uiAmount += ta.uiAmount;
  }

  const ok = uiAmount >= minRequired;
  return {
    ok,
    wallet,
    mint,
    uiAmount,
    minRequired,
    rpc,
    message: ok
      ? `JTX gate PASS — hold ${uiAmount} JTX (≥ ${minRequired})`
      : `JTX gate FAIL — need ≥ ${minRequired} JTX (have ${uiAmount})`,
  };
}
