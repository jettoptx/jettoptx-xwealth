import { usePrivy } from "@privy-io/react-auth";
import { authClient, authEnabled } from "./client";
import { privyEnabled } from "./privy";
import { resolveAvatarUrl } from "./profile-image";
import { inferXHandle } from "@/lib/xmoney";

/** Normalized user shape used across the app, auth on or off. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /**
   * Best-effort X @handle for Money links.
   * Prefer OAuth username; fall back to email local-part / display-name slug.
   */
  handle: string | null;
  /** True when this is the sandbox/dev fallback (auth not configured). */
  isDevFallback: boolean;
  /** Wallet address when signed in via Privy wallet. */
  walletAddress?: string | null;
};

/**
 * Stable fallback user, used ONLY when auth is explicitly disabled
 * (`VITE_AUTH_ENABLED=false`).
 */
export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: resolveAvatarUrl(null),
  handle: "devuser",
  isDevFallback: true,
};

/** `useCurrentUserState()` result: the user plus the session-loading flag. */
export type CurrentUserState = {
  /** The user — `null` BOTH while the session loads and when signed out. */
  user: AppUser | null;
  /** True while the session is still resolving — don't treat `user: null` as signed out yet. */
  isPending: boolean;
};

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
  preferredUsername?: string | null;
};

function toAppUser(user: SessionUser): AppUser {
  const username =
    (typeof user.username === "string" && user.username) ||
    (typeof user.preferredUsername === "string" && user.preferredUsername) ||
    null;
  return {
    id: user.id,
    displayName: user.name ?? null,
    primaryEmail: user.email ?? null,
    // Only keep remote images when present; otherwise JOE default
    profileImageUrl: resolveAvatarUrl(user.image),
    handle: inferXHandle({
      username,
      displayName: user.name ?? null,
      email: user.email ?? null,
    }),
    isDevFallback: false,
  };
}

function usePrivyUserState(): CurrentUserState {
  const { ready, authenticated, user } = usePrivy();

  if (!ready) {
    return { user: null, isPending: true };
  }
  if (!authenticated || !user) {
    return { user: null, isPending: false };
  }

  const twitter = user.twitter;
  const google = user.google;
  const email = user.email?.address ?? google?.email ?? null;

  const username = twitter?.username ?? null;
  const displayName =
    twitter?.name ??
    google?.name ??
    user.email?.address ??
    (user.wallet?.address
      ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`
      : null);

  // X users: pull profile photo. Everyone else (Apple/Google/GitHub/email/wallet):
  // JOE default avatar — do not use letter monograms.
  const profileImageUrl = resolveAvatarUrl(twitter?.profilePictureUrl ?? null);

  const appUser: AppUser = {
    id: user.id,
    displayName,
    primaryEmail: email,
    profileImageUrl,
    handle: inferXHandle({
      username,
      displayName,
      email,
    }),
    isDevFallback: false,
    walletAddress: user.wallet?.address ?? null,
  };

  return { user: appUser, isPending: false };
}

function useBetterAuthUserState(): CurrentUserState {
  if (!authEnabled) return { user: DEV_USER, isPending: false };
  // eslint-disable-next-line react-hooks/rules-of-hooks -- authEnabled constant
  const { data, isPending } = authClient.useSession();
  const user = data?.user as SessionUser | undefined;
  return {
    user: user ? toAppUser(user) : null,
    isPending,
  };
}

/**
 * Current user + loading state.
 * Privy (production) or Better Auth broker (sandbox fallback).
 */
export function useCurrentUserState(): CurrentUserState {
  if (privyEnabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- privyEnabled constant
    return usePrivyUserState();
  }
  return useBetterAuthUserState();
}

export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
