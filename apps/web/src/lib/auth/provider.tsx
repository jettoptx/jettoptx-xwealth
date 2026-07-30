import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { PRIVY_APP_ID, privyEnabled } from "./privy";

/**
 * App-wide auth provider.
 * Privy is the production identity layer (shared with OPTX / SpacetimeDB).
 * Better Auth remains available as sandbox fallback when Privy is off.
 *
 * Do NOT auto-create embedded wallets on login — that spun "Creating your
 * wallet…" forever on xwealth.space. Identity here is X handle + Money pay
 * link; optional Solana wallet can be a later explicit CTA.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!privyEnabled) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["twitter", "email", "wallet", "google", "apple"],
        appearance: {
          theme: "dark",
          accentColor: "#FF6900",
          logo: "/brand/astroknots-icon.png",
          landingHeader: "X Wealth",
          loginMessage: "Link your X handle for agentic X Money pay.",
          showWalletLoginFirst: false,
        },
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
      {children}
    </PrivyProvider>
  );
}
