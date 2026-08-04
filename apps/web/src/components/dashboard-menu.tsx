import { useEffect, useRef, useState, type SVGProps } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Cpu,
  ExternalLink,
  LayoutDashboard,
  Orbit,
  Settings2,
  Sparkles,
} from "lucide-react";
import { OPTX_LINKS } from "@/lib/optx-links";
import { cn } from "@/lib/utils";

/** Small bee mark for Buzz (JettChat) */
function BeeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      {...props}
    >
      <ellipse cx="12" cy="13" rx="4.2" ry="5.2" fill="currentColor" opacity="0.95" />
      <path
        d="M8.2 11.2h7.6M8.5 13.4h7M9 15.5h6"
        stroke="var(--color-bg, #0a0a0c)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="10.4" cy="9.2" r="0.7" fill="var(--color-bg, #0a0a0c)" />
      <circle cx="13.6" cy="9.2" r="0.7" fill="var(--color-bg, #0a0a0c)" />
      <path
        d="M7.2 8.5C5.5 6.2 4.2 5.5 3 6.2c1.4 1.8 2.4 3.4 3.2 5.2M16.8 8.5c1.7-2.3 3-3 4.2-2.3-1.4 1.8-2.4 3.4-3.2 5.2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M12 5.2v2.2M10.2 4.2l1.8 2M13.8 4.2l-1.8 2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Signed-in Dashboard (outer product shell).
 * Augments first, MDX bridges, then agent plugin (jettoptx/jettoptx-xwealth).
 */
export function DashboardMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** SPA routes use TanStack Link so Privy session is not wiped by full reload */
  const items: {
    to?: string;
    href?: string;
    label: string;
    desc: string;
    icon: typeof Sparkles | typeof BeeIcon | typeof Settings2;
    primary?: boolean;
    external?: boolean;
  }[] = [
    {
      to: OPTX_LINKS.augmentsPath,
      label: "Augments",
      desc: "Marketplace · ops · Web4 SEO",
      icon: Sparkles,
      primary: true,
    },
    {
      to: OPTX_LINKS.paylinksPath,
      label: "Pay Links",
      desc: "Sub-page · directory · social send",
      icon: Sparkles,
    },
    {
      to: OPTX_LINKS.settingsPath,
      label: "Settings",
      desc: "Account · login connections · theme",
      icon: Settings2,
    },
    {
      to: OPTX_LINKS.dojoPath,
      label: "DOJO",
      desc: "Operator hub · WARP graph",
      icon: LayoutDashboard,
    },
    {
      to: OPTX_LINKS.warpPath,
      label: "WARP",
      desc: "Nodes graph · Wealth-08 MOA (same session)",
      icon: Orbit,
    },
    {
      href: OPTX_LINKS.jettchat,
      label: "JettChat",
      desc: "Agent harness chat",
      icon: BeeIcon,
      external: true,
    },
    {
      href: OPTX_LINKS.plugin,
      label: "Agent plugin",
      desc: "jettoptx-xwealth · JTX gate · dry-run CLI",
      icon: Cpu,
      external: true,
    },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md border border-border bg-elevated/50 px-2 text-xs font-medium text-fg transition-colors hover:bg-elevated sm:gap-1.5 sm:px-2.5 sm:text-sm",
          open && "bg-elevated ring-1 ring-augment/40",
        )}
      >
        <LayoutDashboard className="size-3.5 text-augment" />
        {!compact && <span className="hidden sm:inline">Dashboard</span>}
        <ChevronDown
          className={cn(
            "size-3.5 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-augment">
              Wealth · OPTX
            </p>
            <p className="text-xs text-muted">
              MOA first · then DOJO / WARP / chat
            </p>
          </div>
          <ul className="p-1.5">
            {items.map(
              ({ to, href, label, desc, icon: Icon, primary, external }) => {
                const className = cn(
                  "flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-elevated",
                  primary && "bg-augment/5 hover:bg-augment/10",
                );
                const body = (
                  <>
                    <span
                      className={cn(
                        "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border bg-bg",
                        primary
                          ? "border-augment/40 bg-augment/10"
                          : "border-border",
                      )}
                    >
                      <Icon className="size-3.5 text-augment" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-medium text-fg">
                        {label}
                        {external && (
                          <ExternalLink className="size-3 text-augment/70" />
                        )}
                      </span>
                      <span className="block text-[11px] leading-snug text-muted">
                        {desc}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={(to ?? href ?? "") + label}>
                    {external && href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className={className}
                      >
                        {body}
                      </a>
                    ) : to ? (
                      <Link
                        to={to}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className={className}
                      >
                        {body}
                      </Link>
                    ) : null}
                  </li>
                );
              },
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
