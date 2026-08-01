import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { PRIVY_APP_ID, privyEnabled } from "./privy";
import { XOAuthTokenProvider } from "./x-oauth-tokens";

/**
 * Detect Backpack / Phantom / Solflare (and other Solana EOAs).
 * Without this, Privy shows “Waiting for Backpack” but never opens the extension.
 */
const solanaConnectors = toSolanaWalletConnectors({
  // Don't auto-reconnect on every page load (avoids surprise popups)
  shouldAutoConnect: false,
});

/**
 * App-wide auth provider.
 * Privy is the production identity layer (shared with OPT𝕏 / SpacetimeDB).
 * Better Auth remains available as sandbox fallback when Privy is off.
 *
 * Do NOT auto-create embedded wallets on login — that spun "Creating your
 * wallet…" forever on xwealth.space. Identity here is X handle + Money pay
 * link; optional Solana wallet can be a later explicit CTA.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!privyEnabled) {
    return <XOAuthTokenProvider>{children}</XOAuthTokenProvider>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: [
          "twitter",
          "google",
          "apple",
          "github",
          "wallet",
          "email",
          "sms",
        ],
        appearance: {
          theme: "dark",
          accentColor: "#FF6900",
          // Jett Optics zia — absolute URL so Privy modal iframe loads our asset
          logo: "https://xwealth.space/brand/jtx-dao-rounded.png",
          landingHeader: "Jett Optics",
          loginMessage: "Link your X handle for agentic X Money pay.",
          showWalletLoginFirst: false,
          // X Wealth settles USDC on Solana — surface Solana wallets first
          walletChainType: "ethereum-and-solana",
          walletList: [
            "detected_solana_wallets",
            "backpack",
            "phantom",
            "solflare",
            "detected_ethereum_wallets",
            "metamask",
            "wallet_connect",
          ],
        },
        // Required for Backpack / Phantom / Solflare to actually open
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        // Avoid freeze on “Creating your wallet…” after X OAuth
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
      }}
    >
      <XOAuthTokenProvider>{children}</XOAuthTokenProvider>
    </PrivyProvider>
  );
}
