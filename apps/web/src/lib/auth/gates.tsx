import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { authEnabled, signOut as betterAuthSignOut } from "./client";
import { privyEnabled } from "./privy";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";
import { avatarProxyUrl } from "./profile-image";

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
  const direct = profileImageUrl;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {proxied || direct ? (
        <img
          src={proxied ?? direct!}
          alt=""
          width={28}
          height={28}
          referrerPolicy="no-referrer"
          title={label}
          className="h-7 w-7 rounded-full border border-border bg-elevated object-cover sm:h-8 sm:w-8"
          onError={(e) => {
            const img = e.currentTarget;
            if (direct && img.src !== direct && !img.dataset.fallback) {
              img.dataset.fallback = "1";
              img.src = direct;
              return;
            }
            img.style.display = "none";
            const sib = img.nextElementSibling as HTMLElement | null;
            if (sib) sib.hidden = false;
          }}
        />
      ) : null}
      <span
        className="grid h-7 w-7 place-items-center rounded-full bg-elevated text-xs font-medium sm:h-8 sm:w-8 sm:text-sm"
        hidden={Boolean(proxied || direct)}
        title={label}
      >
        {label.charAt(0).toUpperCase()}
      </span>
      {!compact && (
        <span className="hidden max-w-[7rem] truncate text-sm font-medium md:inline">
          {label}
        </span>
      )}
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
