/**
 * DoubleZero open-source platform strip for /augments Web4 SEO.
 * Renders every public product, component, docs, and GitHub surface.
 */
import { ExternalLink, Network, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DOUBLEZERO_COMPONENTS,
  DOUBLEZERO_DOCS_SURFACES,
  DOUBLEZERO_PRODUCT_SURFACES,
  DOUBLEZERO_REPOS,
  DOUBLEZERO_SEO,
  DOUBLEZERO_STATUS_LINKS,
  type DoubleZeroStatusSummary,
  type DoubleZeroSurface,
} from "@/lib/doublezero";

type StatusPayload = {
  ok: boolean;
  status?: DoubleZeroStatusSummary;
  message?: string;
};

const GROUPS: Array<{
  id: string;
  title: string;
  items: DoubleZeroSurface[];
}> = [
  { id: "product", title: "Product · status", items: DOUBLEZERO_PRODUCT_SURFACES },
  { id: "components", title: "Architecture", items: DOUBLEZERO_COMPONENTS },
  { id: "docs", title: "Docs", items: DOUBLEZERO_DOCS_SURFACES },
  { id: "repos", title: "Open source", items: DOUBLEZERO_REPOS },
];

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n * 100) / 100);
}

export function DoubleZeroPlatformPanel({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<DoubleZeroStatusSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/doublezero/status");
      const json = (await res.json()) as StatusPayload;
      if (json.status) setStatus(json.status);
      if (!json.ok) setErr(json.message || "status unavailable");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "status fetch failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl border border-sky-500/25 bg-sky-950/20",
        className,
      )}
      aria-label="DoubleZero open-source platform"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-sky-500/20 px-2.5 py-2">
        <img
          src={DOUBLEZERO_SEO.logo}
          alt=""
          className="size-5 object-contain"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-sky-100">
            DoubleZero · open-source platform
          </p>
          <p className="truncate font-mono text-[9px] text-sky-200/55">
            {DOUBLEZERO_SEO.slogan}
          </p>
        </div>
        <a
          href={DOUBLEZERO_STATUS_LINKS}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-sky-400/30 px-1.5 py-0.5 font-mono text-[9px] text-sky-200 hover:bg-sky-400/10"
        >
          <Network className="size-3" />
          status/links
          <ExternalLink className="size-2.5 opacity-70" />
        </a>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-sky-200"
          disabled={busy}
          onClick={() => void load()}
          title="Refresh DoubleZero status"
        >
          <RefreshCw className={cn("size-3", busy && "animate-spin")} />
        </Button>
      </header>

      {status ? (
        <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-sky-500/15 px-2 py-1.5 sm:grid-cols-4">
          <Stat
            label="Network"
            value={status.status}
            tone={status.status === "healthy" ? "ok" : "warn"}
          />
          <Stat
            label="Links"
            value={`${fmt(status.links.healthy)}/${fmt(status.links.total)}`}
          />
          <Stat label="Validators" value={fmt(status.network.validatorsOnDz)} />
          <Stat
            label="p95 lat"
            value={
              status.performance.p95LatencyUs != null
                ? `${fmt(status.performance.p95LatencyUs)}µs`
                : "—"
            }
          />
        </div>
      ) : err ? (
        <p className="border-b border-sky-500/15 px-2.5 py-1 font-mono text-[9px] text-amber-200/80">
          {err} · catalog still listed below
        </p>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-auto p-2",
          compact ? "max-h-48" : "max-h-72",
        )}
      >
        {GROUPS.map((g) => (
          <div key={g.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-wide text-sky-200/50">
                {g.title}
              </p>
              <Badge
                variant="outline"
                className="h-4 border-sky-500/30 px-1 font-mono text-[8px] text-sky-200/70"
              >
                {g.items.length}
              </Badge>
            </div>
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {g.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-1.5 rounded-lg border border-white/8 bg-black/25 px-2 py-1.5 hover:border-sky-400/35 hover:bg-sky-500/10"
                    title={item.blurb}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[10px] font-semibold text-sky-50 group-hover:text-white">
                        {item.name}
                      </span>
                      <span className="block truncate text-[9px] text-sky-100/45">
                        {item.blurb}
                      </span>
                    </span>
                    <ExternalLink className="mt-0.5 size-2.5 shrink-0 text-sky-200/40 group-hover:text-sky-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-md border border-white/8 bg-black/20 px-1.5 py-1">
      <p className="font-mono text-[8px] uppercase text-sky-200/45">{label}</p>
      <p
        className={cn(
          "truncate font-mono text-[10px] font-semibold",
          tone === "ok" && "text-emerald-300",
          tone === "warn" && "text-amber-300",
          !tone && "text-sky-50",
        )}
      >
        {value}
      </p>
    </div>
  );
}
