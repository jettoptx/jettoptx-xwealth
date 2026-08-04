/**
 * Prefer Solana base58 addresses from Privy user / wallet lists.
 * Privy's default `user.wallet` / ethereum `useWallets()` often surface 0x first.
 */

import { looksLikeSolanaPubkey } from "@/lib/usdc-payto";

export function isEvmAddress(addr: string | null | undefined): boolean {
  return Boolean(addr && /^0x[a-fA-F0-9]{40}$/.test(addr.trim()));
}

/** True when addr is usable as an X Wealth Solana desk / JTX wallet. */
export function isSolanaDeskAddress(addr: string | null | undefined): boolean {
  return looksLikeSolanaPubkey(addr);
}

type PrivyWalletSlice = {
  address?: string | null;
  chainType?: string | null;
  type?: string | null;
};

type PrivyUserSlice = {
  wallet?: { address?: string | null; chainType?: string | null } | null;
  linkedAccounts?: PrivyWalletSlice[] | null;
};

/**
 * Pick the best Solana address from a Privy user object.
 * Order: primary wallet if Solana → linked solana wallets → any base58 wallet link.
 */
export function pickPrivySolanaAddress(
  user: PrivyUserSlice | null | undefined,
): string | null {
  if (!user) return null;

  const primary = user.wallet?.address?.trim();
  if (
    primary &&
    (user.wallet?.chainType === "solana" || isSolanaDeskAddress(primary))
  ) {
    return primary;
  }

  for (const a of user.linkedAccounts ?? []) {
    const addr = a.address?.trim();
    if (!addr) continue;
    if (a.chainType === "solana" && isSolanaDeskAddress(addr)) return addr;
  }

  for (const a of user.linkedAccounts ?? []) {
    const addr = a.address?.trim();
    if (
      addr &&
      (a.type === "wallet" || a.type === "smart_wallet") &&
      isSolanaDeskAddress(addr)
    ) {
      return addr;
    }
  }

  return null;
}

/** First Solana-shaped address from a list of wallet addresses (connected wallets). */
export function firstSolanaAddress(
  addresses: Array<string | null | undefined>,
): string | null {
  for (const a of addresses) {
    const v = (a || "").trim();
    if (isSolanaDeskAddress(v)) return v;
  }
  return null;
}

/**
 * Resolve desk wallet for settings / x402:
 * pinned Solana → store Solana → Privy Solana → connected Solana wallets.
 * Never returns a bare EVM 0x address.
 */
export function resolveSolanaDeskWallet(opts: {
  preferred?: string | null;
  stored?: string | null;
  privySolana?: string | null;
  connectedAddresses?: Array<string | null | undefined>;
}): string {
  const candidates = [
    opts.preferred,
    opts.stored,
    opts.privySolana,
    ...(opts.connectedAddresses ?? []),
  ];
  return firstSolanaAddress(candidates) ?? "";
}
