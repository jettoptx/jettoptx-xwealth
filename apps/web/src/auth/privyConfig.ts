/**
 * Jett Optics Privy — X Wealth / OPTX web surface.
 *
 * Primary CTA: X/Twitter OAuth
 * Secondary (dropdown): email, Google, wallet — same Jett Optics Privy app
 *
 * IMPORTANT: Do NOT auto-create Solana embedded wallets on login.
 * `createOnLogin: 'users-without-wallets'` freezes many sessions on
 * “Creating your wallet… Please wait…”. L1 identity completes without a wallet;
 * L2 (JTX / pay) can create or paste a wallet later.
 *
 * Dashboard: docs/PRIVY-DASHBOARD.md
 */
import type { PrivyClientConfig } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'

export const PRIVY_APP_ID =
  (import.meta.env.VITE_PRIVY_APP_ID as string | undefined)?.trim() ||
  'cmoq24szk00by0dl5abm0ss19'

export const privyEnabled =
  Boolean(PRIVY_APP_ID) && import.meta.env.VITE_PRIVY_ENABLED !== 'false'

type LoginMethod =
  | 'twitter'
  | 'email'
  | 'google'
  | 'wallet'
  | 'apple'
  | 'github'
  | 'sms'

/** Primary product path */
export const XWEALTH_PRIMARY_LOGIN: LoginMethod[] = ['twitter']

/**
 * Full set registered on the client so “Other options” can open Privy
 * narrowed to one method. Dashboard must have each method enabled.
 */
export const XWEALTH_ALL_LOGIN_METHODS: LoginMethod[] = [
  'twitter',
  'email',
  'google',
  'wallet',
]

export const XWEALTH_PRIVY_CONFIG: PrivyClientConfig = {
  // Never block OAuth on embedded-wallet provisioning
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'off',
    },
    solana: {
      createOnLogin: 'off',
    },
  },
  externalWallets: {
    solana: { connectors: toSolanaWalletConnectors() },
  },
  appearance: {
    // ethereum-and-solana avoids forcing a Solana wallet UI during pure X login
    walletChainType: 'ethereum-and-solana',
    theme: 'dark',
    accentColor: '#ffffff',
    logo: 'https://xwealth.space/favicon.svg',
    landingHeader: 'OPTX',
    loginMessage: 'Sign with OPTX — Jett Optics identity',
  },
  loginMethods: XWEALTH_ALL_LOGIN_METHODS,
}

/** @deprecated use XWEALTH_PRIMARY_LOGIN — kept for assert scripts */
export const XWEALTH_LOGIN_OPTIONS = {
  loginMethods: XWEALTH_PRIMARY_LOGIN,
}
