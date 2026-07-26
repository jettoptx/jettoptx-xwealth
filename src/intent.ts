/**
 * Payout intent types — dry-run is first-class; LIVE is blocked until settle ships.
 * No SpacetimeDB required.
 */

import type { MoneyLinkKind, MoneyLinkResolve } from "./x-money-link.js";

export type IntentMode = "dry-run" | "LIVE";

export type PayoutAsset = "USDC" | "USD" | "SOL" | "JTX";

export type PayoutIntent = {
  ok: boolean;
  mode: IntentMode;
  live: boolean;
  settle: boolean;
  /** Would-be chain/X settle — always false until product ships */
  wouldSettle: boolean;
  handle: string | null;
  transferUrl: string | null;
  kind: MoneyLinkKind | null;
  method: MoneyLinkResolve["method"];
  amount: number;
  asset: PayoutAsset;
  /** Agent wallet pubkey (public) */
  fromWallet: string | null;
  /** True if a local keypair file was loaded (secret never included) */
  signerPresent: boolean;
  /** True if keypair pubkey matches fromWallet */
  signerMatchesWallet: boolean | null;
  jtxGate: {
    ok: boolean;
    uiAmount: number | null;
    message: string;
  };
  ts: string;
  note: string;
  blockers: string[];
  warnings: string[];
};

export type DryRunRequest = {
  /** X handle, pay URL, or transfer URL */
  to: string;
  amount: number;
  asset?: PayoutAsset;
  /** Force mode. Default dry-run. LIVE is rejected until settle exists. */
  mode?: IntentMode;
  /** Explicit human LIVE confirmation string — must be exactly "LIVE" */
  liveConfirm?: string;
  wallet?: string;
  method?: MoneyLinkResolve["method"];
};
