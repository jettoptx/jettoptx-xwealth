import type { ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { authEnabled, signOut as betterAuthSignOut } from "./client";
import { privyEnabled } from "./privy";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";
import { avatarProxyUrl, DEFAULT_AVATAR_URL } from "./profile-image";

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present (real session, or the disabled-auth dev user). */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

/**
 * Signed-in identity chip + sign-out.
 * `compact` = avatar + icon logout (mobile header).
 */
export function UserButton({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <UserChip
      compact={compact}
      label={user.displayName ?? user.primaryEmail ?? "Account"}
      profileImageUrl={user.profileImageUrl}
    />
  );
}

function UserChip({
  compact,
  label,
  profileImageUrl,
}: {
  compact: boolean;
  label: string;
  profileImageUrl: string | null;
}) {
  const proxied = avatarProxyUrl(profileImageUrl);
  const direct =
    profileImageUrl && profileImageUrl !== DEFAULT_AVATAR_URL
      ? profileImageUrl
      : null;
  // X CDN → proxy; local JOE default → direct path; never letter monogram
  const src = proxied ?? direct ?? DEFAULT_AVATAR_URL;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link
        to="/settings"
        title={`${label} · Settings`}
        className="flex items-center gap-1.5 rounded-full outline-none ring-offset-bg focus-visible:ring-2 focus-visible:ring-augment/50"
      >
        <img
          src={src}
          alt=""
          width={28}
          height={28}
          referrerPolicy="no-referrer"
          className="h-7 w-7 rounded-full border border-border bg-black object-cover sm:h-8 sm:w-8"
          onError={(e) => {
            const img = e.currentTarget;
            // 1) proxy failed → try direct remote
            if (direct && !img.dataset.triedDirect) {
              img.dataset.triedDirect = "1";
              img.src = direct;
              return;
            }
            // 2) remote failed → JOE default
            if (!img.dataset.triedDefault) {
              img.dataset.triedDefault = "1";
              img.src = DEFAULT_AVATAR_URL;
            }
          }}
        />
        {!compact && (
          <span className="hidden max-w-[7rem] truncate text-sm font-medium md:inline">
            {label}
          </span>
        )}
      </Link>
      {privyEnabled ? (
        <PrivyLogoutButton />
      ) : authEnabled ? (
        <BetterAuthLogoutButton />
      ) : null}
    </div>
  );
}

function PrivyLogoutButton() {
  const { logout } = usePrivy();
  return (
    <button
      type="button"
      onClick={() => {
        void logout().then(() => {
          window.location.href = "/";
        });
      }}
      className="inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-xs text-muted transition-colors hover:bg-elevated hover:text-fg sm:px-2 sm:text-sm"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut className="size-3.5 sm:hidden" />
      <span className="hidden underline-offset-4 hover:underline sm:inline">
        Sign out
      </span>
    </button>
  );
}

function BetterAuthLogoutButton() {
  return (
    <button
      type="button"
      onClick={() => void betterAuthSignOut("/")}
      className="inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-xs text-muted transition-colors hover:bg-elevated hover:text-fg sm:px-2 sm:text-sm"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut className="size-3.5 sm:hidden" />
      <span className="hidden underline-offset-4 hover:underline sm:inline">
        Sign out
      </span>
    </button>
  );
}
