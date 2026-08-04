import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardMenu } from "@/components/dashboard-menu";
import { JtxMark, UsdcSolanaRail, XLogo } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { user, isPending } = useCurrentUserState();
  const [mounted, setMounted] = useState(false);
  const [embed, setEmbed] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setEmbed(sp.get("embed") === "1");
    } catch {
      setEmbed(false);
    }
  }, []);
  const showSkeleton = !mounted || isPending;

  // WARP market panel iframes /augments?embed=1 — hide chrome inside frame
  if (embed) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-2 px-3 sm:h-14 sm:gap-3 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-1.5 sm:gap-2"
        >
          <JtxMark
            size={28}
            className="h-7 w-7 shrink-0 rounded-md border border-border bg-surface object-cover sm:h-8 sm:w-8 sm:rounded-lg"
          />
          <div className="min-w-0 leading-none">
            <div className="flex items-center gap-1 font-display text-sm font-semibold tracking-tight">
              <XLogo className="size-3.5 shrink-0 text-fg" aria-hidden />
              <span className="whitespace-nowrap">Wealth</span>
            </div>
            <div className="mt-0.5 hidden truncate text-[10px] uppercase tracking-wider text-subtle sm:block">
              Jett Optical Encryption
            </div>
          </div>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 sm:flex">
          <HeaderLink to="/console">Console</HeaderLink>
          <HeaderLink to="/augments" accent="orange">
            Augments
          </HeaderLink>
          <HeaderLink to="/dojo">DOJO</HeaderLink>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Real Circle USDC + Solana logos — settlement rail */}
          <UsdcSolanaRail compact className="inline-flex" />
          <ThemeToggle />
          {showSkeleton ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-elevated sm:w-20" />
          ) : user ? (
            <>
              <DashboardMenu />
              <UserButton compact />
            </>
          ) : (
            <Button
              asChild
              size="sm"
              variant="default"
              className="h-8 gap-1.5 px-2.5 sm:px-3"
            >
              <Link to="/login" className="inline-flex items-center gap-1.5">
                <XLogo className="size-3.5 shrink-0" />
                <span>Pay Link</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderLink({
  to,
  children,
  accent,
}: {
  to: "/console" | "/dojo" | "/" | "/augments";
  children: ReactNode;
  accent?: "orange";
}) {
  const orange = accent === "orange";
  return (
    <Link
      to={to}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        orange
          ? "text-augment hover:bg-augment/10 hover:text-augment-soft [&.active]:bg-augment/15 [&.active]:text-augment-soft"
          : "text-muted hover:bg-elevated hover:text-fg [&.active]:bg-elevated [&.active]:text-fg",
      )}
      activeProps={{
        className: orange
          ? "active bg-augment/15 text-augment-soft"
          : "active bg-elevated text-fg",
      }}
    >
      {children}
    </Link>
  );
}
