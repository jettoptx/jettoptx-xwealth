/**
 * Example: Jett Optics–style Privy provider forced to X (Twitter) OAuth only.
 * Copy into xwealth-ui or any Next/React host. Requires NEXT_PUBLIC_PRIVY_APP_ID.
 */
"use client";

import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import {
  defaultSolanaRpcsPlugin,
  toSolanaWalletConnectors,
} from "@privy-io/react-auth/solana";
import type { ReactNode } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

/** X Wealth product surface — X OAuth only (no email / Google / SMS). */
export const XWEALTH_PRIVY_CONFIG: PrivyClientConfig = {
  embeddedWallets: {
    solana: { createOnLogin: "users-without-wallets" },
  },
  externalWallets: {
    solana: { connectors: toSolanaWalletConnectors() },
  },
  appearance: {
    walletChainType: "solana-only",
    theme: "dark",
    accentColor: "#6d8cff",
  },
  loginMethods: ["twitter"],
  plugins: [defaultSolanaRpcsPlugin()],
};

export function XWealthPrivyProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is required for X Wealth login");
  }
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={XWEALTH_PRIVY_CONFIG}>
      {children}
    </PrivyProvider>
  );
}
