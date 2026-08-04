/**
 * Augments — Web4 search + tooling operating surface.
 * Layers: command bar · tool grid · agent session workspace.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Beaker,
  BookOpen,
  Bot,
  Command,
  ExternalLink,
  FlaskConical,
  Home,
  KeyRound,
  Landmark,
  LayoutGrid,
  Loader2,
  Network,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Terminal,
  Wallet,
} from "lucide-react";
import { OPTX_LINKS } from "@/lib/optx-links";
import { OPTX_MARK } from "@/lib/brand";
import {
  WEB4_API_PLUGINS,
  WEB4_SEO,
  WEB4_SLOGAN,
  type DiscoverLane,
  type Web4ApiPlugin,
} from "@/lib/web4-seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JTX_BUY_URL } from "@/lib/jtx-api";

export type CmdTab = "search" | "agents" | "protocols" | "docs" | "console";
export type RailId =
  | "dashboard"
  | "search"
  | "tools"
  | "agents"
  | "analytics"
  | "labs"
  | "security"
  | "docs"
  | "marketplace";

export type ToolModule = {
  id: string;
  name: string;
  blurb: string;
  status: "Active" | "Beta" | "Local";
  category: "Agents" | "Infra" | "DeFi" | "Research";
  action: "Open" | "Deploy" | "Connect";
  href?: string;
  to?: string;
  pluginId?: string;
  accent?: string;
  logo?: string;
};

const EXAMPLE_QUERIES = [
  "MEV opportunities on Solana",
  "List active voice agents",
  "Show Hermes harness docs",
  "Quantum-safe wallets",
] as const;

const FILTERS = ["On-chain", "Agents", "Protocols", "Docs", "Spaces"] as const;

const LOCAL_MODULES: ToolModule[] = [
  {
    id: "agent-console",
    name: "Agent Console",
    blurb: "Start, stop, and monitor Hermes / harness agents",
    status: "Active",
    category: "Agents",
    action: "Open",
    to: "/console",
    accent: "#22d3ee",
  },
  {
    id: "chain-explorer",
    name: "Chain Explorer++",
    blurb: "MEV, validators, tx analytics — Solana-first",
    status: "Beta",
    category: "Infra",
    action: "Open",
    href: "https://www.quicknode.com/",
    accent: "#60a5fa",
  },
  {
    id: "space-vault",
    name: "Space Vault",
    blurb: "Encrypted spatial workspaces · JTX-backed",
    status: "Beta",
    category: "Research",
    action: "Connect",
    href: OPTX_LINKS.jtx,
    accent: "#e8a87c",
  },
  {
    id: "protocol-registry",
    name: "Protocol Registry",
    blurb: "Browse and deploy Solana / L2 protocol surfaces",
    status: "Active",
    category: "DeFi",
    action: "Open",
    href: "https://blockworks.com/products/api-mcp",
    accent: "#a3e635",
  },
  {
    id: "rag-workspace",
    name: "RAG Workspace",
    blurb: "Docs, code, and agent memory in one scope",
    status: "Local",
    category: "Research",
    action: "Open",
    href: OPTX_LINKS.moaDocs,
    accent: "#fbbf24",
  },
  {
    id: "voice-lab",
    name: "Voice Lab",
    blurb: "Test voice agents and audio pipelines",
    status: "Beta",
    category: "Agents",
    action: "Deploy",
    to: "/console",
    accent: "#f472b6",
  },
  {
    id: "quantum-sandbox",
    name: "Quantum Sandbox",
    blurb: "Small quantum algo demos and simulations",
    status: "Local",
    category: "Research",
    action: "Open",
    href: OPTX_LINKS.jtxBuy,
    accent: "#38bdf8",
  },
  {
    id: "defi-dashboard",
    name: "DeFi Dashboard",
    blurb: "Positions, yields, risk across protocols",
    status: "Active",
    category: "DeFi",
    action: "Open",
    href: "/warp",
    accent: "#4ade80",
  },
  {
    id: "infra-monitor",
    name: "Infra Monitor",
    blurb: "Cloudflare / Vercel / GitHub / validator health",
    status: "Beta",
    category: "Infra",
    action: "Connect",
    to: "/dojo",
    accent: "#fb923c",
  },
];

function pluginToModule(p: Web4ApiPlugin): ToolModule {
  return {
    id: `plugin-${p.id}`,
    name: p.name,
    blurb: p.blurb,
    status: p.mcp ? "Active" : "Beta",
    category:
      p.lane === "defi"
        ? "DeFi"
        : p.lane === "x"
          ? "Agents"
          : "Agents",
    action: "Open",
    href: p.href,
    pluginId: p.id,
    accent: p.accent,
    logo: p.logo,
  };
}

const RAIL: Array<{
  id: RailId;
  label: string;
  icon: typeof Home;
}> = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "tools", label: "Tools", icon: LayoutGrid },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "labs", label: "Labs", icon: Beaker },
  { id: "security", label: "Security / Keys", icon: KeyRound },
  { id: "docs", label: "Docs", icon: BookOpen },
  { id: "marketplace", label: "Marketplace", icon: Sparkles },
];

type Props = {
  embed?: boolean;
  wallet: string;
  onWalletChange: (w: string) => void;
  jtxOk: boolean | null;
  jtxBusy?: boolean;
  onCheckJtx: () => void;
  discoverQ: string;
  onDiscoverQ: (q: string) => void;
  lane: DiscoverLane;
  onLane: (l: DiscoverLane) => void;
  discoverBusy: boolean;
  onRunDiscover: (opts?: {
    query?: string;
    laneOverride?: DiscoverLane;
  }) => void;
  onOpenMarketplace: () => void;
  network: string;
  onNetwork: (n: string) => void;
};

export function Web4OperatingSurface({
  embed,
  wallet,
  onWalletChange,
  jtxOk,
  jtxBusy,
  onCheckJtx,
  discoverQ,
  onDiscoverQ,
  lane,
  onLane,
  discoverBusy,
  onRunDiscover,
  onOpenMarketplace,
  network,
  onNetwork,
}: Props) {
  const [cmdTab, setCmdTab] = useState<CmdTab>("search");
  const [rail, setRail] = useState<RailId>("dashboard");
  const [toolFilter, setToolFilter] = useState<string>("All");
  const [toolQuery, setToolQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [agentOpen, setAgentOpen] = useState(true);
  const [cmdFocused, setCmdFocused] = useState(false);

  const modules = useMemo(() => {
    const fromPlugins = WEB4_API_PLUGINS.map(pluginToModule);
    const ids = new Set(fromPlugins.map((m) => m.name.toLowerCase()));
    const locals = LOCAL_MODULES.filter(
      (m) => !ids.has(m.name.toLowerCase()),
    );
    return [...fromPlugins, ...locals];
  }, []);

  const filteredTools = useMemo(() => {
    const q = toolQuery.trim().toLowerCase();
    return modules.filter((m) => {
      if (toolFilter !== "All" && m.category !== toolFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.blurb.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    });
  }, [modules, toolFilter, toolQuery]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById("web4-cmd-input");
        el?.focus();
        setCmdFocused(true);
        setRail("search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function runSearch(q?: string) {
    const query = (q ?? discoverQ).trim();
    if (!query) return;
    setRecent((r) => [query, ...r.filter((x) => x !== query)].slice(0, 6));
    if (cmdTab === "docs") {
      window.open(OPTX_LINKS.moaDocs, "_blank", "noreferrer");
      return;
    }
    if (cmdTab === "console") {
      window.location.href = "/console";
      return;
    }
    const nextLane: DiscoverLane =
      cmdTab === "protocols" || filterImpliesDefi(query)
        ? "defi"
        : cmdTab === "agents"
          ? "agents"
          : lane;
    onLane(nextLane);
    onRunDiscover({ query, laneOverride: nextLane });
  }

  function onRail(id: RailId) {
    setRail(id);
    if (id === "marketplace") onOpenMarketplace();
    if (id === "docs") window.open(OPTX_LINKS.moaDocs, "_blank", "noreferrer");
    if (id === "security") window.location.href = OPTX_LINKS.settingsPath;
    if (id === "agents") setCmdTab("agents");
    if (id === "search") {
      setCmdTab("search");
      document.getElementById("web4-cmd-input")?.focus();
    }
  }

  return (
    <main
      className={cn(
        "flex overflow-hidden bg-bg text-fg",
        embed
          ? "h-dvh max-h-dvh"
          : "h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)]",
      )}
    >
      {/* Left rail */}
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface/80 py-3 sm:flex">
        {RAIL.map((item) => {
          const Icon = item.icon;
          const active = rail === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onRail(item.id)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg transition",
                active
                  ? "bg-accent/15 text-accent shadow-[0_0_16px_color-mix(in_oklab,var(--color-accent)_28%,transparent)] dark:bg-accent/20 dark:shadow-[0_0_20px_rgba(255,105,0,0.25)]"
                  : "text-subtle hover:bg-elevated hover:text-fg",
              )}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-gradient-to-r from-surface via-bg to-elevated/80 px-3 py-2 sm:px-4 dark:from-[#0b1020] dark:via-[#0a0a0c] dark:to-[#120a14]">
          <div className="min-w-0 shrink-0">
            <div className="font-display text-sm font-semibold tracking-tight">
              {OPTX_MARK} · Augments
            </div>
            <div className="font-mono text-[10px] text-sky-700 dark:text-cyan-300/80">
              Web4 Search & Tooling
            </div>
          </div>

          <div className="order-last flex w-full min-w-0 flex-1 flex-col gap-1 sm:order-none sm:mx-3">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["search", "Search"],
                  ["agents", "Agents"],
                  ["protocols", "Protocols"],
                  ["docs", "Docs"],
                  ["console", "Console"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setCmdTab(id);
                    if (id === "console") window.location.href = "/console";
                  }}
                  className={cn(
                    "rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                    cmdTab === id
                      ? "bg-sky-600/12 text-sky-800 dark:bg-cyan-500/15 dark:text-cyan-200"
                      : "text-subtle hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-surface/90 px-3 py-1.5 shadow-sm backdrop-blur-md transition dark:bg-black/50 dark:shadow-none",
                cmdFocused
                  ? "border-sky-500/45 shadow-[0_0_20px_rgba(14,165,233,0.12)] dark:border-cyan-400/50 dark:shadow-[0_0_24px_rgba(34,211,238,0.15)]"
                  : "border-border",
              )}
            >
              <Command className="size-3.5 shrink-0 text-sky-700/80 dark:text-cyan-300/70" />
              <Input
                id="web4-cmd-input"
                value={discoverQ}
                onChange={(e) => onDiscoverQ(e.target.value)}
                onFocus={() => setCmdFocused(true)}
                onBlur={() => setCmdFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="Search chains, agents, protocols, docs…"
                className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:inline">
                ⌘K
              </kbd>
              <Button
                size="sm"
                className="h-7 gap-1"
                disabled={discoverBusy || !discoverQ.trim()}
                onClick={() => runSearch()}
              >
                {discoverBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                Run
              </Button>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <select
              value={network}
              onChange={(e) => onNetwork(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 font-mono text-[11px] text-fg dark:bg-black/40"
              title="Network"
            >
              <option value="all">All nets</option>
              <option value="solana">Solana</option>
              <option value="btc">BTC</option>
              <option value="l2">L2s</option>
            </select>
            <Input
              value={wallet}
              onChange={(e) => onWalletChange(e.target.value)}
              placeholder="Solana wallet"
              className="h-8 w-28 font-mono text-[11px] sm:w-40"
              spellCheck={false}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={jtxBusy || wallet.trim().length < 32}
              onClick={onCheckJtx}
            >
              {jtxBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wallet className="size-3.5" />
              )}
              {jtxOk === true ? "JTX ✓" : jtxOk === false ? "JTX ✗" : "Gate"}
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 px-2">
              <Link to="/settings">
                <Settings2 className="size-3.5" />
              </Link>
            </Button>
          </div>
        </header>

        {jtxOk === false ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn sm:px-4">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="size-3.5" />
              Tools locked — need ≥1 JTX on the wallet above.
            </span>
            <a
              href={JTX_BUY_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2"
            >
              Buy JTX · astroknots.space/buy
            </a>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Hero / search zone */}
          <section className="relative border-b border-border px-3 py-5 sm:px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.10),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(196,95,24,0.10),_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.08),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(255,105,0,0.08),_transparent_45%)]"
            />
            <div className="relative mx-auto max-w-5xl space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-700/80 dark:text-cyan-300/70">
                {WEB4_SEO.name}
              </p>
              <p className="font-display text-lg font-semibold tracking-tight text-accent sm:text-xl">
                {WEB4_SLOGAN}
              </p>
              <h2 className="max-w-3xl font-display text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                Web4 search engine and tooling dashboard for on-chain
                intelligence, agent orchestration, and encrypted spatial
                workflows.
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      if (f === "Agents") onLane("agents");
                      if (f === "On-chain" || f === "Protocols") onLane("defi");
                      if (f === "Docs")
                        window.open(OPTX_LINKS.moaDocs, "_blank", "noreferrer");
                      setCmdTab(
                        f === "Agents"
                          ? "agents"
                          : f === "Protocols"
                            ? "protocols"
                            : f === "Docs"
                              ? "docs"
                              : "search",
                      );
                    }}
                    className="rounded-full border border-border bg-elevated/70 px-2.5 py-1 font-mono text-[11px] text-muted hover:border-sky-500/40 hover:text-fg dark:bg-white/5 dark:hover:border-cyan-400/40"
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      onDiscoverQ(q);
                      runSearch(q);
                    }}
                    className="rounded-md border border-dashed border-border-strong px-2 py-1 text-left text-[11px] text-muted hover:border-accent/50 hover:text-fg"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted">
                <span className="font-mono uppercase tracking-wide text-subtle">
                  Recent
                </span>
                {recent.length === 0 ? (
                  <span>No recent searches</span>
                ) : (
                  recent.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="text-sky-800 hover:underline dark:text-cyan-200/80"
                      onClick={() => {
                        onDiscoverQ(r);
                        runSearch(r);
                      }}
                    >
                      {r}
                    </button>
                  ))
                )}
                <span className="mx-1 text-border-strong">·</span>
                <span className="font-mono uppercase tracking-wide text-subtle">
                  Pinned
                </span>
                <Link to="/dojo" className="text-accent hover:underline">
                  DOJO
                </Link>
                <Link
                  to="/warp"
                  search={{ market: undefined, vibe: undefined }}
                  className="text-accent hover:underline"
                >
                  WARP
                </Link>
                <Link to="/console" className="text-accent hover:underline">
                  Console
                </Link>
              </div>
            </div>
          </section>

          {/* Tool grid */}
          <section className="px-3 py-5 sm:px-6">
            <div className="mx-auto max-w-6xl space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold">
                    Tooling modules
                  </h3>
                  <p className="text-xs text-muted">
                    Filterable composable tools — Open · Deploy · Connect
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={toolQuery}
                    onChange={(e) => setToolQuery(e.target.value)}
                    placeholder="Filter tools…"
                    className="h-8 w-40 text-xs"
                  />
                  {(["All", "Agents", "Infra", "DeFi", "Research"] as const).map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setToolFilter(c)}
                        className={cn(
                          "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase",
                          toolFilter === c
                            ? "bg-accent/20 text-accent"
                            : "text-subtle hover:text-fg",
                        )}
                      >
                        {c}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTools.map((m) => (
                  <ToolCard
                    key={m.id}
                    module={m}
                    onRunPlugin={() => {
                      const plugin = WEB4_API_PLUGINS.find(
                        (p) => p.id === m.pluginId,
                      );
                      if (!plugin) return;
                      if (plugin.lane) onLane(plugin.lane);
                      if (plugin.query) {
                        onDiscoverQ(plugin.query);
                        onRunDiscover({
                          query: plugin.query,
                          laneOverride: plugin.lane,
                        });
                      }
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onOpenMarketplace}
                >
                  Open marketplace directory
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={JTX_BUY_URL} target="_blank" rel="noreferrer">
                    Buy JTX
                    <ExternalLink className="ml-1 size-3" />
                  </a>
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Agent session panel */}
        <section
          className={cn(
            "shrink-0 border-t border-border bg-surface/95 backdrop-blur-md dark:bg-black/60",
            agentOpen ? "max-h-[30vh]" : "max-h-10",
          )}
        >
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left sm:px-4"
            onClick={() => setAgentOpen((o) => !o)}
          >
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-sky-800 dark:text-cyan-200/80">
              <Terminal className="size-3.5" />
              Agent & session workspace
            </span>
            <span className="text-[10px] text-subtle">
              {agentOpen ? "Collapse" : "Expand"}
            </span>
          </button>
          {agentOpen ? (
            <div className="grid gap-2 overflow-auto px-3 pb-3 sm:grid-cols-3 sm:px-4">
              <SessionCard
                title="Hermes harness"
                status="idle"
                meta="No live session · attach from Console"
                actionLabel="New session"
                href="/console"
              />
              <SessionCard
                title="Voice agents"
                status="local"
                meta="Voice Lab · dry-run only"
                actionLabel="Open lab"
                href="/console"
              />
              <SessionCard
                title="DOJO paylink"
                status={jtxOk ? "ready" : "locked"}
                meta={
                  jtxOk
                    ? "JTX pass · x402 dry-run ready"
                    : "JTX locked · buy or check wallet"
                }
                actionLabel={jtxOk ? "Open DOJO" : "Buy JTX"}
                href={jtxOk ? "/dojo" : JTX_BUY_URL}
                external={!jtxOk}
              />
              <div className="sm:col-span-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="h-7">
                  <Link to="/dojo">Attach to space</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="h-7">
                  <a href={OPTX_LINKS.pluginGrok} target="_blank" rel="noreferrer">
                    Export trace docs
                  </a>
                </Button>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-subtle">
                  <Network className="size-3" />
                  net={network} · lane={lane}
                </span>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function filterImpliesDefi(q: string): boolean {
  return /\b(aave|defi|token|yield|mev|solana|jup|liquidity)\b/i.test(q);
}

function ToolCard({
  module: m,
  onRunPlugin,
}: {
  module: ToolModule;
  onRunPlugin: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {m.logo ? (
            <img
              src={m.logo}
              alt=""
              className="size-7 rounded-md border border-border bg-elevated/80 object-cover dark:bg-transparent"
            />
          ) : (
            <span
              className="flex size-7 items-center justify-center rounded-md border border-border bg-elevated/60"
              style={{ color: m.accent ?? "#0e7490" }}
            >
              <FlaskConical className="size-3.5" />
            </span>
          )}
          <div>
            <div className="text-sm font-medium leading-tight">{m.name}</div>
            <div className="font-mono text-[10px] text-subtle">{m.category}</div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[9px]",
            m.status === "Active" &&
              "border-emerald-600/40 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300",
            m.status === "Beta" &&
              "border-sky-600/40 text-sky-800 dark:border-cyan-500/40 dark:text-cyan-200",
            m.status === "Local" && "border-border-strong text-subtle",
          )}
        >
          {m.status}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted">{m.blurb}</p>
      <div className="mt-3">
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated/80 px-2 py-1 font-mono text-[10px] uppercase text-fg group-hover:border-sky-500/45 dark:bg-white/5 dark:group-hover:border-cyan-400/40">
          {m.action}
          <ExternalLink className="size-2.5 opacity-60" />
        </span>
      </div>
    </>
  );

  const className =
    "group block h-full rounded-xl border border-border bg-surface p-3 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:border-sky-500/35 hover:bg-elevated/50 hover:shadow-[0_8px_28px_rgba(14,165,233,0.08)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none dark:hover:border-cyan-400/30 dark:hover:bg-white/[0.06] dark:hover:shadow-[0_8px_30px_rgba(34,211,238,0.08)]";

  if (m.pluginId) {
    return (
      <button type="button" className={cn(className, "w-full text-left")} onClick={onRunPlugin}>
        {inner}
      </button>
    );
  }
  if (m.to) {
    return (
      <Link to={m.to} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <a
      href={m.href}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {inner}
    </a>
  );
}

function SessionCard({
  title,
  status,
  meta,
  actionLabel,
  href,
  external,
}: {
  title: string;
  status: "idle" | "local" | "ready" | "locked";
  meta: string;
  actionLabel: string;
  href: string;
  external?: boolean;
}) {
  const badge =
    status === "ready"
      ? "text-emerald-700 dark:text-emerald-300"
      : status === "locked"
        ? "text-warn"
        : "text-subtle";
  const body = (
    <div className="rounded-lg border border-border bg-elevated/50 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{title}</span>
        <span className={cn("font-mono text-[10px] uppercase", badge)}>
          {status}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted">{meta}</p>
      <span className="mt-2 inline-block font-mono text-[10px] text-sky-800 dark:text-cyan-200/80">
        {actionLabel} →
      </span>
    </div>
  );
  if (external || href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  }
  return <Link to={href}>{body}</Link>;
}
