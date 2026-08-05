/**
 * Resolve / provision the signed-in user's Privy Solana wallet for SKU gates.
 * Product gates (DOJO JTX ≥1) must bind to this address — not arbitrary paste.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import {
  useCreateWallet,
  useWallets,
} from "@privy-io/react-auth/solana";
import { looksLikeSolanaPubkey } from "@/lib/usdc-payto";
import { sleep } from "@/lib/privy-pay-sign";
import { privyEnabled } from "@/lib/auth/privy";
import { defaultWalletFromEnv } from "@/lib/jtxGate";

export type PrivySolanaWalletState = {
  ready: boolean;
  authenticated: boolean;
  /** All linked / embedded Solana addresses from Privy for this user */
  addresses: string[];
  /** Preferred address (first wallet / linked Solana account) */
  primaryAddress: string | null;
  /** True while createWallet is in flight */
  creating: boolean;
  login: () => void;
  /**
   * Return an owned Solana address, creating an embedded wallet if needed.
   * Throws when the user is not authenticated or provisioning fails.
   */
  ensureWallet: () => Promise<string>;
  /** True when `address` is one of this user's Privy Solana wallets */
  ownsAddress: (address: string) => boolean;
};

function linkedSolanaAddresses(
  user: ReturnType<typeof usePrivy>["user"],
): string[] {
  if (!user) return [];
  const out: string[] = [];
  const push = (addr?: string | null) => {
    const a = addr?.trim();
    if (!a || !looksLikeSolanaPubkey(a)) return;
    if (!out.includes(a)) out.push(a);
  };

  const primary = user.wallet as
    | { address?: string; chainType?: string }
    | undefined;
  // Prefer explicit Solana chainType; fall back only when address looks Solana.
  if (primary?.chainType === "solana") {
    push(primary.address);
  } else if (
    primary?.chainType == null &&
    looksLikeSolanaPubkey(primary?.address)
  ) {
    push(primary?.address);
  }

  for (const account of user.linkedAccounts ?? []) {
    const any = account as {
      type?: string;
      address?: string;
      chainType?: string;
    };
    if (any.chainType === "solana") {
      push(any.address);
      continue;
    }
    // Skip EVM / unknown chain wallets even if base58-shaped.
    if (any.chainType && any.chainType !== "solana") continue;
    if (
      (any.type === "wallet" || any.type === "smart_wallet") &&
      looksLikeSolanaPubkey(any.address)
    ) {
      push(any.address);
    }
  }
  return out;
}

function usePrivySolanaWalletLive(): PrivySolanaWalletState {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [creating, setCreating] = useState(false);
  /** Fresh createWallet results before useWallets / linkedAccounts catch up */
  const [sessionOwned, setSessionOwned] = useState<string[]>([]);
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;

  useEffect(() => {
    if (!authenticated) setSessionOwned([]);
  }, [authenticated]);

  const addresses = useMemo(() => {
    const fromHooks = wallets
      .map((w) => w.address?.trim())
      .filter((a): a is string => Boolean(a && looksLikeSolanaPubkey(a)));
    const linked = linkedSolanaAddresses(user);
    const merged: string[] = [];
    for (const a of [...fromHooks, ...linked, ...sessionOwned]) {
      if (!merged.includes(a)) merged.push(a);
    }
    return merged;
  }, [wallets, user, sessionOwned]);

  const primaryAddress = addresses[0] ?? null;

  const ownsAddress = useCallback(
    (address: string) => {
      const w = address.trim();
      if (!w) return false;
      return addresses.some((a) => a === w);
    },
    [addresses],
  );

  const rememberOwned = useCallback((addr: string) => {
    const a = addr.trim();
    if (!looksLikeSolanaPubkey(a)) return;
    setSessionOwned((prev) => (prev.includes(a) ? prev : [...prev, a]));
  }, []);

  const ensureWallet = useCallback(async (): Promise<string> => {
    if (!ready) throw new Error("Privy is still loading");
    if (!authenticated) throw new Error("Sign in to unlock with your wallet");

    const existing = walletsRef.current[0]?.address?.trim();
    if (existing && looksLikeSolanaPubkey(existing)) {
      rememberOwned(existing);
      return existing;
    }

    const linked = linkedSolanaAddresses(user)[0];
    if (linked) {
      rememberOwned(linked);
      return linked;
    }

    setCreating(true);
    try {
      const created = await createWallet();
      const want = created.wallet?.address?.trim();
      for (let i = 0; i < 25; i++) {
        await sleep(200);
        const list = walletsRef.current;
        const found =
          (want ? list.find((w) => w.address === want) : undefined) || list[0];
        const addr = found?.address?.trim();
        if (addr && looksLikeSolanaPubkey(addr)) {
          rememberOwned(addr);
          return addr;
        }
      }
      if (want && looksLikeSolanaPubkey(want)) {
        rememberOwned(want);
        return want;
      }
      throw new Error("Solana wallet not ready after create");
    } finally {
      setCreating(false);
    }
  }, [ready, authenticated, user, createWallet, rememberOwned]);

  return {
    ready,
    authenticated: Boolean(ready && authenticated),
    addresses,
    primaryAddress,
    creating,
    login: () => login(),
    ensureWallet,
    ownsAddress,
  };
}

/**
 * When Privy is off (local sandbox), bind to VITE_SOLANA_WALLET only —
 * never accept arbitrary paste as an unlock path.
 */
function usePrivySolanaWalletDisabled(): PrivySolanaWalletState {
  const env = defaultWalletFromEnv();
  const addresses =
    env && looksLikeSolanaPubkey(env) ? [env] : ([] as string[]);
  const primaryAddress = addresses[0] ?? null;
  return {
    ready: true,
    authenticated: true,
    addresses,
    primaryAddress,
    creating: false,
    login: () => {},
    ensureWallet: async () => {
      if (primaryAddress) return primaryAddress;
      throw new Error(
        "Privy disabled — set VITE_SOLANA_WALLET for local JTX gate testing",
      );
    },
    ownsAddress: (address: string) => {
      const w = address.trim();
      return Boolean(w && addresses.some((a) => a === w));
    },
  };
}

/**
 * Privy Solana wallet for product SKU gates.
 * Must be used under AuthProvider when `privyEnabled`.
 */
export function usePrivySolanaWallet(): PrivySolanaWalletState {
  if (!privyEnabled) {
    return usePrivySolanaWalletDisabled();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks -- privyEnabled constant
  return usePrivySolanaWalletLive();
}
