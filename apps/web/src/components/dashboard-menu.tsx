import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { OPTX_LINKS } from "@/lib/optx-links";
import { cn } from "@/lib/utils";

type DashItem = {
  href: string;
  label: string;
  desc: string;
  icon: typeof LayoutDashboard;
  external: boolean;
};

/**
 * Signed-in header menu → real OPTX surfaces (not stale DOJO/WARP paths).
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

  const items: DashItem[] = [
    {
      href: OPTX_LINKS.moa,
      label: "MOA",
      desc: "Wealth · Map of Augments (wealth.astroknots.space)",
      icon: LayoutDashboard,
      external: true,
    },
    {
      href: OPTX_LINKS.buzzChat,
      label: "Buzz chat",
      desc: "Space Cowboys channel · jettoptx.chat",
      icon: MessageCircle,
      external: true,
    },
    {
      href: OPTX_LINKS.augments,
      label: "Augments",
      desc: "Marketplace · agent pay cards",
      icon: Sparkles,
      external: false,
    },
    {
      href: OPTX_LINKS.docs,
      label: "OPTX Docs",
      desc: "SDK · AARON · platform docs",
      icon: BookOpen,
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
          open && "bg-elevated ring-1 ring-border",
        )}
      >
        <LayoutDashboard className="size-3.5 text-accent" />
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
            <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">
              OPTX · jump links
            </p>
            <p className="text-xs text-muted">
              MOA · Buzz · Augments · Docs
            </p>
          </div>
          <ul className="p-1.5">
            {items.map(({ href, label, desc, icon: Icon, external }) => (
              <li key={href}>
                {external ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-elevated"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-border bg-bg">
                      <Icon className="size-3.5 text-accent" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-medium text-fg">
                        {label}
                        <ExternalLink className="size-3 text-subtle" />
                      </span>
                      <span className="block text-[11px] leading-snug text-muted">
                        {desc}
                      </span>
                    </span>
                  </a>
                ) : (
                  <Link
                    to={href as "/augments"}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-elevated"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-border bg-bg">
                      <Icon className="size-3.5 text-accent" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-medium text-fg">
                        {label}
                      </span>
                      <span className="block text-[11px] leading-snug text-muted">
                        {desc}
                      </span>
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
