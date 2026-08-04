/**
 * WARP top-right logo dashboard.
 * Graph switches stay on /warp (no navigation).
 * Shell routes use router.navigate (SPA only — no full reload, no new tab, no logout).
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { OPTX_LINKS } from "@/lib/optx-links";

export type DashboardViewId = "moa" | "marketplace";

export type DashboardMenuProps = {
  view: DashboardViewId;
  marketHandle?: string | null;
  sessionHandle?: string | null;
  onSelectMoa: () => void;
  onSelectMarketplace: () => void;
  className?: string;
  variant?: "default" | "logo";
  align?: "left" | "right";
};

type ShellRoute = "/augments" | "/paylinks" | "/dojo" | "/warp" | "/console";

export function DashboardMenu({
  view,
  marketHandle,
  sessionHandle,
  onSelectMoa,
  onSelectMarketplace,
  className,
  variant = "default",
  align = "left",
}: DashboardMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const handle = sessionHandle || marketHandle || null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    view === "marketplace"
      ? marketHandle
        ? `Market · @${marketHandle}`
        : "Marketplace"
      : "MOA Graph";

  /** Client-side only — never full document navigation */
  function goShell(to: ShellRoute) {
    setOpen(false);
    if (pathname === to) return;
    void navigate({ to, resetScroll: false });
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {variant === "logo" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          title={`Dashboard · ${label} · same session`}
          aria-label={`Dashboard · ${label}`}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white transition duration-200",
            open
              ? "border-orange-400 shadow-[0_0_0_1px_rgba(255,98,0,0.5),0_0_22px_rgba(255,98,0,0.55),0_0_40px_rgba(255,98,0,0.25)] ring-2 ring-orange-500/80 ring-offset-2 ring-offset-[#0a0a0c]"
              : "border-white/20 ring-1 ring-white/10 hover:border-orange-400/60 hover:shadow-[0_0_16px_rgba(255,98,0,0.35)]",
          )}
        >
          <img
            src="/jtx-logo.jpg"
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 font-mono text-[11px] transition",
            open
              ? "border-orange-400/60 bg-orange-500/12 text-orange-100 shadow-[0_0_18px_rgba(255,98,0,0.3)]"
              : "border-white/12 bg-black/55 text-white/75 hover:border-white/25 hover:text-white",
          )}
          title="Dashboard views · same session"
        >
          <span className="font-semibold tracking-wide">Dashboard</span>
          <span className="hidden max-w-[7rem] truncate text-[9px] text-white/40 sm:inline">
            {label}
          </span>
          <span
            className={cn(
              "text-[9px] text-white/45 transition",
              open && "rotate-180",
            )}
            aria-hidden
          >
            ▾
          </span>
        </button>
      )}

      {open && (
        <div
          role="menu"
          aria-label="Dashboard"
          className={cn(
            "absolute top-[calc(100%+8px)] z-[80] max-h-[min(80vh,520px)] w-[min(100vw-1.5rem,300px)] overflow-y-auto overflow-x-hidden rounded-xl border border-orange-500/25 bg-[#0c0e14]/98 py-1 shadow-2xl shadow-black/60 backdrop-blur-md",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="border-b border-white/[0.08] px-3 pb-2 pt-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-orange-400/70">
              Dashboard · same session
            </p>
            {handle ? (
              <p className="mt-1.5 inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-200">
                @{handle}
              </p>
            ) : (
              <p className="mt-1 font-mono text-[10px] text-white/40">
                Not signed in
              </p>
            )}
            <p className="mt-1 font-mono text-[8px] text-white/30">
              No reload · no new tab · Privy stays
            </p>
          </div>

          <p className="px-3 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
            Graph (stay on /warp)
          </p>
          <MenuItem
            active={view === "moa"}
            title="MOA Graph"
            subtitle="Switch view only — keeps state"
            badge="this UI"
            onClick={() => {
              onSelectMoa();
              setOpen(false);
            }}
          />
          <MenuItem
            active={view === "marketplace"}
            title="Market graph"
            subtitle="Switch view only — pay · VIBE · cards"
            onClick={() => {
              onSelectMarketplace();
              setOpen(false);
            }}
          />

          <div className="my-1 border-t border-white/[0.08]" />
          <p className="px-3 pb-1 pt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
            Shell (SPA navigate)
          </p>
          <NavItem
            title="Augments"
            subtitle="Marketplace · ops · Web4 SEO"
            active={pathname === "/augments" || pathname === "/paylinks"}
            onClick={() => goShell("/augments")}
          />
          <NavItem
            title="Pay Links"
            subtitle="Directory · social send (under Augments)"
            active={pathname === "/paylinks"}
            onClick={() => goShell("/paylinks")}
          />
          <NavItem
            title="DOJO"
            subtitle="Operator hub"
            active={pathname === "/dojo"}
            onClick={() => goShell("/dojo")}
          />
          <NavItem
            title="WARP"
            subtitle="This graph (no leave if already here)"
            active={pathname === "/warp"}
            onClick={() => goShell("/warp")}
          />
          <NavItem
            title="Pay Console"
            subtitle="X Money · x402"
            active={pathname === "/console"}
            onClick={() => goShell("/console")}
          />

          <div className="my-1 border-t border-white/[0.08]" />
          <p className="px-3 pb-1 pt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
            External (new tab only)
          </p>
          <ExternalItem
            title="JettChat"
            subtitle="Agent harness chat"
            href={OPTX_LINKS.jettchat}
            onNavigate={() => setOpen(false)}
          />
          <ExternalItem
            title="Agent plugin"
            subtitle="GitHub · install skill"
            href={OPTX_LINKS.plugin}
            onNavigate={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  title,
  subtitle,
  badge,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition",
        active
          ? "bg-orange-500/15 text-white"
          : "text-white/80 hover:bg-white/[0.06]",
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span className="font-mono text-[12px] font-semibold tracking-wide">
          {title}
        </span>
        {active && (
          <span className="rounded bg-orange-500/25 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-orange-200">
            open
          </span>
        )}
        {badge && !active && (
          <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-white/40">
            {badge}
          </span>
        )}
      </span>
      <span className="font-mono text-[10px] leading-snug text-white/40">
        {subtitle}
      </span>
    </button>
  );
}

function NavItem({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition",
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/80 hover:bg-white/[0.06]",
      )}
    >
      <span className="font-mono text-[12px] font-semibold tracking-wide">
        {title}
        {active ? (
          <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[8px] uppercase text-white/50">
            here
          </span>
        ) : null}
      </span>
      <span className="font-mono text-[10px] leading-snug text-white/40">
        {subtitle}
      </span>
    </button>
  );
}

function ExternalItem({
  title,
  subtitle,
  href,
  onNavigate,
}: {
  title: string;
  subtitle: string;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <a
      role="menuitem"
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onNavigate}
      className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-white/80 transition hover:bg-white/[0.06]"
    >
      <span className="flex items-center gap-1.5 font-mono text-[12px] font-semibold tracking-wide">
        {title}
        <span className="text-[9px] text-white/30">↗</span>
      </span>
      <span className="font-mono text-[10px] leading-snug text-white/40">
        {subtitle}
      </span>
    </a>
  );
}
