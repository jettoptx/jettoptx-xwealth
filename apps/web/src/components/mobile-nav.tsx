import { Link } from "@tanstack/react-router";
import { FlaskConical, LayoutDashboard, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/console" as const, label: "Console", icon: LayoutDashboard },
  { to: "/augments" as const, label: "Augments", icon: Sparkles, accent: true },
  { to: "/settings" as const, label: "Settings", icon: Settings2 },
  { to: "/dojo" as const, label: "DOJO", icon: FlaskConical },
];

/** Fixed bottom tab bar — mobile only. */
export function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch">
        {items.map(({ to, label, icon: Icon, accent }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className={cn(
                "flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide",
                accent
                  ? "text-augment/80 [&.active]:text-augment"
                  : "text-subtle [&.active]:text-fg",
              )}
              activeProps={{
                className: accent ? "active text-augment" : "active text-fg",
              }}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
