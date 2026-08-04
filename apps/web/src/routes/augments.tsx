import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Bot,
  ChevronDown,
  ExternalLink,
  Fish,
  GripVertical,
  Landmark,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { OPTX_LINKS } from "@/lib/optx-links";
import { jtxDeniedMessage, jtxFetch, JTX_BUY_URL } from "@/lib/jtx-api";
import {
  checkJtxGate,
  isOwnedSolanaWallet,
  jtxUiGatePassed,
  type JtxGateResult,
} from "@/lib/jtxGate";
import { Web4OperatingSurface } from "@/components/augments/web4-operating-surface";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AUGMENT_SEED,
  MARKETPLACE_TAGS,
  filterListings,
  formatCompact,
  mergeLiveGraph,
  monogram,
  type AugmentListing,
} from "@/lib/augments";
import { avatarProxyUrl } from "@/lib/auth/profile-image";
import { useXOAuthAccess } from "@/lib/auth/x-oauth-tokens";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { usePrivySolanaWallet } from "@/lib/auth/use-privy-solana-wallet";
import { useSocialGraph } from "@/lib/use-social-graph";
import { useWealthStore } from "@/lib/store";
import { copyText } from "@/lib/utils";
import { XLogo } from "@/components/brand-icons";
import { OPTX_MARK } from "@/lib/brand";
import {
  WEB4_API_PLUGINS,
  WEB4_SEO,
  WEB4_SLOGAN,
  WEB4_TOOL_PIPELINE,
  type DiscoverLane,
  type Web4ApiPlugin,
} from "@/lib/web4-seo";
import {
  loadXSession,
  normalizeHandle,
  saveMarketMode,
  saveVibeInvite,
} from "@/lib/augment-marketplace";
type CryptoAssetHit = {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  rank: number | null;
  priceUsd: number | null;
  change24h: number | null;
  marketCapUsd: number | null;
  volume24h: number | null;
  category: string | null;
  sector: string | null;
  sectors: string[];
  tags: string[];
  logoUrl: string | null;
  profileUrl: string;
  source: string;
  isDefi: boolean;
};

function formatUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "â€”";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(3)}`;
}

export const Route = createFileRoute("/augments")({
  validateSearch: (search: Record<string, unknown>) => ({
    embed: search.embed === "1" || search.embed === 1 ? "1" : undefined,
  }),
  component: AugmentsPage,
});

type TabId = "all" | "following" | "followers" | "featured";

const PAGE_SIZE = 16;

type TinyFishStatus = {
  configured: boolean;
  mcp: string;
  keys: string;
  docs: string;
};

type SearchHit = {
  position: number;
  site_name?: string;
  title: string;
  snippet?: string;
  url: string;
  date?: string;
  publisher?: string;
};

type SearchPayload = {
  ok?: boolean;
  query?: string;
  results?: SearchHit[];
  handles?: string[];
  total_results?: number;
  error?: string;
  message?: string;
};

type CryptoSearchPayload = {
  ok?: boolean;
  query?: string;
  assets?: CryptoAssetHit[];
  source?: string;
  mcp?: string;
  product?: string;
  error?: string;
  message?: string;
};

type EnrichPayload = {
  ok?: boolean;
  enrichment?: {
    handle: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    hasXMoney: boolean | null;
    evidence: string[];
    source: string;
    payUrl: string;
  };
  error?: string;
  message?: string;
  mcp?: string;
  keys?: string;
};

function AugmentsPage() {
  const { user, isPending } = useCurrentUserState();
  const signedIn = Boolean(user && !user.isDevFallback);
  const navigate = useNavigate();
  const xOauth = useXOAuthAccess();
  const graph = useSocialGraph(signedIn ? xOauth.accessToken : null);

  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [overrides, setOverrides] = useState<
    Record<string, Partial<AugmentListing>>
  >({});
  /** No default celebrity/seed selection — blank until user picks a row */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tfStatus, setTfStatus] = useState<TinyFishStatus | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [probingMoney, setProbingMoney] = useState(false);
  const [lastEnrich, setLastEnrich] = useState<EnrichPayload | null>(null);
  const [lane, setLane] = useState<DiscoverLane>("agents");
  const [discoverQ, setDiscoverQ] = useState<string>(
    WEB4_SEO.defaultQueries[0]?.query ?? "X Money agent payments",
  );
  const [discoverBusy, setDiscoverBusy] = useState(false);
  /** Which plugin card's Run triggered the current discover (null = Discover panel itself) */
  const [runningPluginId, setRunningPluginId] = useState<string | null>(null);
  const [discover, setDiscover] = useState<SearchPayload | null>(null);
  const [cryptoHits, setCryptoHits] = useState<CryptoSearchPayload | null>(
    null,
  );

  const starred = useWealthStore((s) => s.starredAugments);
  const toggleStar = useWealthStore((s) => s.toggleStarAugment);
  const setSolanaWallet = useWealthStore((s) => s.setSolanaWallet);
  const {
    authenticated: privyAuthed,
    addresses: privyAddresses,
    primaryAddress: privyPrimary,
    creating: privyCreating,
    login: privyLogin,
    ensureWallet,
  } = usePrivySolanaWallet();

  /** Default = Web4 ops dashboard; marketplace = legacy directory panels */
  const [surface, setSurface] = useState<"ops" | "marketplace">("ops");
  const [gate, setGate] = useState<JtxGateResult | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
  const [network, setNetwork] = useState("solana");

  const wallet = privyPrimary ?? "";

  useEffect(() => {
    if (!privyAuthed) {
      setGate(null);
      return;
    }
    if (privyPrimary) setSolanaWallet(privyPrimary);
    setGate((prev) =>
      prev && isOwnedSolanaWallet(prev.wallet, privyAddresses) ? prev : null,
    );
  }, [privyAuthed, privyPrimary, privyAddresses, setSolanaWallet]);

  const runGate = useCallback(async () => {
    if (!privyAuthed) {
      privyLogin();
      toast.error("Sign in to check JTX on your Privy Solana wallet");
      return;
    }
    setGateBusy(true);
    try {
      const w = (await ensureWallet()).trim();
      const result = await checkJtxGate(w);
      const owned = privyAddresses.includes(w)
        ? privyAddresses
        : [...privyAddresses, w];
      const passed = result.ok && isOwnedSolanaWallet(result.wallet, owned);
      setGate(
        passed
          ? result
          : {
              ...result,
              ok: false,
              error: result.ok
                ? "JTX balance must be on your Privy Solana wallet"
                : (result.error ?? "Need ≥1 JTX"),
            },
      );
      setSolanaWallet(w);
      if (passed) toast.success(`JTX pass · ${result.uiAmount}`);
      else
        toast.error(result.error ?? "Need ≥1 JTX on your Privy wallet", {
          action: {
            label: "Buy JTX",
            onClick: () => window.open(JTX_BUY_URL, "_blank"),
          },
        });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gate check failed");
      setGate(null);
    } finally {
      setGateBusy(false);
    }
  }, [
    privyAuthed,
    privyLogin,
    ensureWallet,
    privyAddresses,
    setSolanaWallet,
  ]);

  const ownedForUi =
    wallet && !privyAddresses.includes(wallet)
      ? [...privyAddresses, wallet]
      : privyAddresses;
  const jtxUiOk = jtxUiGatePassed(
    gate,
    gate?.wallet && !ownedForUi.includes(gate.wallet)
      ? [...ownedForUi, gate.wallet]
      : ownedForUi,
  );

  useEffect(() => {
    void fetch("/api/tinyfish/enrich")
      .then((r) => r.json())
      .then((j: TinyFishStatus) => setTfStatus(j))
      .catch(() =>
        setTfStatus({
          configured: false,
          mcp: "https://agent.tinyfish.ai/mcp",
          keys: "https://agent.tinyfish.ai/api-keys",
          docs: "https://docs.tinyfish.ai/mcp-integration",
        }),
      );
  }, []);

  /**
   * Logged out → blank directory (no demo seed).
   * Logged in → live X graph + seed marketplace merged.
   */
  const catalog = useMemo(() => {
    if (!signedIn) return [] as AugmentListing[];
    const merged = mergeLiveGraph(AUGMENT_SEED, {
      following: graph.following,
      followers: graph.followers,
    });
    return merged.map((item) => {
      const o = overrides[item.handle.toLowerCase()];
      return o ? { ...item, ...o } : item;
    });
  }, [signedIn, graph.following, graph.followers, overrides]);

  const filtered = useMemo(
    () => filterListings(catalog, { tab, query, tag }),
    [catalog, tab, query, tag],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const selected =
    signedIn && selectedId
      ? (catalog.find((x) => x.id === selectedId) ?? null)
      : null;

  // Clear selection when signing out or catalog empties
  useEffect(() => {
    if (!signedIn) {
      setSelectedId(null);
      return;
    }
    if (selectedId && !catalog.some((x) => x.id === selectedId)) {
      setSelectedId(null);
    }
  }, [signedIn, selectedId, catalog]);

  const liveCount = graph.following.length + graph.followers.length;
  const moneyYes = catalog.filter((x) => x.hasXMoney === true).length;
  const moneyNo = catalog.filter((x) => x.hasXMoney === false).length;
  const moneyUnknown = catalog.filter(
    (x) => x.hasXMoney == null || x.hasXMoney === undefined,
  ).length;

  /** Probe X Money for the visible directory page via TinyFish (real pay pages). */
  const probePageMoney = useCallback(async () => {
    if (!signedIn) {
      toast.error("Sign in first");
      return;
    }
    const handles = slice
      .map((x) => x.handle)
      .filter(Boolean)
      .slice(0, 20);
    if (handles.length === 0) {
      toast.message("No rows on this page");
      return;
    }
    setProbingMoney(true);
    try {
      const res = await jtxFetch("/api/x/probe-money", {
        method: "POST",
        body: JSON.stringify({ handles }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        tinyfish?: boolean;
        counts?: { yes: number; no: number; unknown: number; total: number };
        results?: Record<
          string,
          { hasXMoney: boolean | null; source: string }
        >;
        message?: string;
        error?: string;
        buyUrl?: string;
        keys?: string;
      };
      if (!res.ok || !json.results) {
        toast.error(jtxDeniedMessage(json) || "Money probe failed", {
          action: json.buyUrl
            ? {
                label: "Buy JTX",
                onClick: () => window.open(json.buyUrl || JTX_BUY_URL, "_blank"),
              }
            : undefined,
        });
        return;
      }
      setOverrides((prev) => {
        const next = { ...prev };
        for (const [h, r] of Object.entries(json.results!)) {
          next[h.toLowerCase()] = {
            ...next[h.toLowerCase()],
            hasXMoney: r.hasXMoney,
          };
        }
        return next;
      });
      const c = json.counts;
      toast.success(
        c
          ? `Money probe · yes ${c.yes} · no ${c.no} · ? ${c.unknown}${
              json.tinyfish ? " · TinyFish" : " · HTML"
            }`
          : "Money probe complete",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Money probe failed");
    } finally {
      setProbingMoney(false);
    }
  }, [signedIn, slice]);

  const runEnrich = useCallback(
    async (handle: string, deep = false) => {
      setEnriching(true);
      setLastEnrich(null);
      try {
        const res = await jtxFetch("/api/tinyfish/enrich", {
          method: "POST",
          body: JSON.stringify({ handle, deep }),
        });
        const json = (await res.json()) as EnrichPayload & { buyUrl?: string };
        setLastEnrich(json);
        if (!res.ok || !json.enrichment) {
          toast.error(
            jtxDeniedMessage(json) ||
              json.message ||
              json.error ||
              "TinyFish enrich failed",
            {
              action: json.buyUrl
                ? {
                    label: "Buy JTX",
                    onClick: () =>
                      window.open(json.buyUrl || JTX_BUY_URL, "_blank"),
                  }
                : undefined,
            },
          );
          return;
        }
        const e = json.enrichment;
        setOverrides((prev) => ({
          ...prev,
          [handle.toLowerCase()]: {
            displayName: e.displayName || undefined,
            bio: e.bio || undefined,
            avatarUrl: e.avatarUrl,
            hasXMoney: e.hasXMoney,
            payUrl: e.payUrl,
            live: true,
            tags: undefined,
          },
        }));
        toast.success(
          e.hasXMoney === true
            ? `@${handle} · X Money yes`
            : e.hasXMoney === false
              ? `@${handle} · no X Money`
              : `@${handle} · enriched (Money unknown)`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setEnriching(false);
      }
    },
    [],
  );

  const runAgentDiscover = useCallback(
    async (opts?: {
      query?: string;
      domainType?: "web" | "news" | "research_paper";
      purpose?: string;
    }) => {
      const q = (opts?.query ?? discoverQ).trim();
      if (!q) return;
      setDiscoverBusy(true);
      setDiscover(null);
      setCryptoHits(null);
      try {
        const res = await jtxFetch("/api/tinyfish/search", {
          method: "POST",
          body: JSON.stringify({
            query: q,
            location: "US",
            language: "en",
            domainType: opts?.domainType ?? "web",
            purpose:
              opts?.purpose ??
              `X Wealth Web4 Agent SEO: discover agent-payable identities for ${q}`,
          }),
        });
        const json = (await res.json()) as SearchPayload & { buyUrl?: string };
        setDiscover(json);
        if (!res.ok) {
          toast.error(
            jtxDeniedMessage(json) || json.message || json.error || "Discover failed",
            {
              action: json.buyUrl
                ? {
                    label: "Buy JTX",
                    onClick: () =>
                      window.open(json.buyUrl || JTX_BUY_URL, "_blank"),
                  }
                : undefined,
            },
          );
          return;
        }
        toast.success(
          `Agents Â· ${json.results?.length ?? 0} hits` +
            (json.handles?.length ? ` Â· ${json.handles.length} @handles` : ""),
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setDiscoverBusy(false);
      }
    },
    [discoverQ],
  );

  const runCryptoDiscover = useCallback(
    async (opts?: { query?: string; mode?: "crypto" | "defi" }) => {
      const q = (opts?.query ?? discoverQ).trim();
      if (!q) return;
      const mode = opts?.mode ?? (lane === "defi" ? "defi" : "crypto");
      setDiscoverBusy(true);
      setCryptoHits(null);
      setDiscover(null);
      try {
        const res = await jtxFetch("/api/blockworks/search", {
          method: "POST",
          body: JSON.stringify({ query: q, mode, limit: 12 }),
        });
        const json = (await res.json()) as CryptoSearchPayload & {
          buyUrl?: string;
        };
        setCryptoHits(json);
        if (!res.ok) {
          toast.error(
            jtxDeniedMessage(json) ||
              json.message ||
              json.error ||
              "Crypto search failed",
            {
              action: json.buyUrl
                ? {
                    label: "Buy JTX",
                    onClick: () =>
                      window.open(json.buyUrl || JTX_BUY_URL, "_blank"),
                  }
                : undefined,
            },
          );
          return;
        }
        toast.success(
          `Blockworks Â· ${json.assets?.length ?? 0} ${mode === "defi" ? "DeFi" : "token"} hits`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setDiscoverBusy(false);
      }
    },
    [discoverQ, lane],
  );

  const runDiscover = useCallback(
    async (opts?: {
      query?: string;
      domainType?: "web" | "news" | "research_paper";
      purpose?: string;
      mode?: "crypto" | "defi";
      laneOverride?: DiscoverLane;
    }) => {
      const active = opts?.laneOverride ?? lane;
      // Agents + X â†’ TinyFish agent/web; DeFi â†’ Blockworks
      if (active === "defi") {
        await runCryptoDiscover({
          query: opts?.query,
          mode: opts?.mode ?? "defi",
        });
      } else {
        await runAgentDiscover(opts);
      }
    },
    [lane, runAgentDiscover, runCryptoDiscover],
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    plugins: false,
    discover: false,
    directory: false,
    detail: false,
  });
  const togglePanel = (id: string) =>
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const embed =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embed") === "1";

  if (surface === "ops") {
    return (
      <Web4OperatingSurface
        embed={embed}
        wallet={wallet}
        walletLocked
        authenticated={privyAuthed}
        walletCreating={privyCreating}
        onSignIn={() => privyLogin()}
        jtxOk={gate ? jtxUiOk : null}
        jtxBusy={gateBusy}
        onCheckJtx={() => void runGate()}
        discoverQ={discoverQ}
        onDiscoverQ={setDiscoverQ}
        lane={lane}
        onLane={setLane}
        discoverBusy={discoverBusy}
        onRunDiscover={(opts) => void runDiscover(opts)}
        onOpenMarketplace={() => setSurface("marketplace")}
        network={network}
        onNetwork={setNetwork}
      />
    );
  }

  return (
    <main
      className={cn(
        "flex flex-col overflow-hidden bg-bg",
        embed
          ? "h-dvh max-h-dvh"
          : "h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-3.5rem)]",
      )}
    >
      {/* Top chrome â€” fixed height, no page scroll */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2 backdrop-blur-md sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setSurface("ops")}
            >
              ← Ops
            </Button>
            <h1 className="font-display text-sm font-semibold tracking-tight sm:text-base">
              {OPTX_MARK} · Augment Marketplace
            </h1>
            <span className="hidden font-mono text-[10px] text-subtle sm:inline">
              {WEB4_SLOGAN}
            </span>
          </div>
        </div>

        {/* Primary lanes: Agents Â· DeFi Â· X */}
        <Tabs
          value={lane}
          onValueChange={(v) => {
            const next = v as DiscoverLane;
            setLane(next);
            setDiscover(null);
            setCryptoHits(null);
            if (next === "agents") {
              setDiscoverQ(
                WEB4_SEO.defaultQueries[0]?.query ?? "X Money agent payments",
              );
            } else if (next === "defi") {
              setDiscoverQ("aave");
            } else {
              setDiscoverQ("X Money pay link @handles");
            }
          }}
        >
          <TabsList className="h-8 rounded-full border border-border bg-elevated/60 p-0.5">
            <TabsTrigger value="agents" className="h-7 gap-1 rounded-full px-3 text-xs data-[state=active]:bg-surface">
              <Fish className="size-3.5" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="defi" className="h-7 gap-1 rounded-full px-3 text-xs data-[state=active]:bg-surface">
              <Landmark className="size-3.5" />
              DeFi
            </TabsTrigger>
            <TabsTrigger value="x" className="h-7 gap-1 rounded-full px-3 text-xs data-[state=active]:bg-surface">
              <XLogo className="size-3.5" />
              X
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Docs MOA lives on jettoptx.dev — not a rival full-page toggle */}
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
          <a
            href={OPTX_LINKS.moaDocs}
            target="_blank"
            rel="noreferrer"
            title="Open OPTX docs Map of Augments (external)"
          >
            <BookOpen className="size-3.5" />
            Docs
            <ExternalLink className="size-3" />
          </a>
        </Button>

        <Button asChild size="sm" variant="secondary" className="h-8">
          <Link to="/console">Console</Link>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-2">
          <Group
            orientation="horizontal"
            className="h-full gap-0"
          >
            {/* LEFT column */}
            <Panel defaultSize={62} minSize={40} className="min-w-0">
              <Group
                orientation="vertical"
                className="h-full"
              >
                <Panel defaultSize={38} minSize={18} collapsible>
                  <DashWindow
                    id="plugins"
                    title="API plugins"
                    subtitle="Grok · Aeon · Chat · TinyFish · Blockworks · QuickNode · X"
                    collapsed={collapsed.plugins}
                    onToggle={() => togglePanel("plugins")}
                  >
                    <div className="grid h-full auto-rows-min grid-cols-2 gap-2 overflow-auto p-2 sm:grid-cols-3 lg:grid-cols-4">
                      {WEB4_API_PLUGINS.filter((p) => {
                        // Always show full plugin strip (Blockworks + QuickNode included).
                        // Lane only highlights which Discover backend Run will hit.
                        if (lane === "defi") {
                          return (
                            p.lane === "defi" ||
                            p.pinAgents ||
                            p.id === "blockworks" ||
                            p.id === "quicknode" ||
                            p.id === "tinyfish"
                          );
                        }
                        if (lane === "x") {
                          return (
                            p.lane === "x" ||
                            p.pinAgents ||
                            p.id === "chat-api-xchat" ||
                            p.id === "xwealth-plugin" ||
                            p.id === "x-graph"
                          );
                        }
                        // Agents: every plugin including Blockworks + QuickNode
                        return true;
                      }).map((plugin) => (
                        <ApiPluginTile
                          key={plugin.id}
                          plugin={plugin}
                          busy={runningPluginId === plugin.id}
                          compact
                          onDiscover={() => {
                            if (plugin.lane) {
                              setLane(plugin.lane);
                              setDiscover(null);
                              setCryptoHits(null);
                            }
                            if (plugin.query) setDiscoverQ(plugin.query);
                            setRunningPluginId(plugin.id);
                            void runDiscover({
                              query: plugin.query,
                              laneOverride: plugin.lane,
                              mode:
                                plugin.lane === "defi" ? "defi" : undefined,
                              purpose: `Web4 Discover via ${plugin.name}`,
                            }).finally(() => setRunningPluginId(null));
                          }}
                        />
                      ))}
                    </div>
                  </DashWindow>
                </Panel>

                <Separator className="group flex h-1.5 items-center justify-center bg-border/40 transition hover:bg-augment/40">
                  <div className="h-0.5 w-8 rounded-full bg-border-strong group-hover:bg-augment" />
                </Separator>

                <Panel defaultSize={62} minSize={25}>
                  <DashWindow
                    id="directory"
                    title="Directory"
                    subtitle={`${filtered.length} listings · ${tab}${
                      liveCount ? ` · ${liveCount} graph` : ""
                    } · Money ✓${moneyYes} confirmed / ✗${moneyNo} none / ?${moneyUnknown} unprobed`}
                    collapsed={collapsed.directory}
                    onToggle={() => togglePanel("directory")}
                    toolbar={
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <div className="relative min-w-[8rem] flex-1">
                          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
                          <Input
                            value={query}
                            onChange={(e) => {
                              setQuery(e.target.value);
                              setPage(0);
                            }}
                            placeholder="Search…"
                            className="h-7 pl-7 text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 gap-1 font-mono text-[10px]"
                          disabled={!signedIn || probingMoney || slice.length === 0}
                          title="Probe X Money on this page via TinyFish (no official X API for Money)"
                          onClick={() => void probePageMoney()}
                        >
                          {probingMoney ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Wallet className="size-3" />
                          )}
                          Probe Money
                        </Button>
                        <Tabs
                          value={tab}
                          onValueChange={(v) => {
                            setTab(v as TabId);
                            setPage(0);
                          }}
                        >
                          <TabsList className="h-7">
                            <TabsTrigger value="all" className="h-6 px-2 text-[10px]">
                              All
                            </TabsTrigger>
                            <TabsTrigger
                              value="following"
                              className="h-6 px-2 text-[10px]"
                            >
                              Following
                            </TabsTrigger>
                            <TabsTrigger
                              value="followers"
                              className="h-6 px-2 text-[10px]"
                            >
                              Followers
                            </TabsTrigger>
                            <TabsTrigger
                              value="featured"
                              className="h-6 px-2 text-[10px]"
                            >
                              Featured
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    }
                  >
                    <div className="flex h-full min-h-0 flex-col">
                      <div className="min-h-0 flex-1 overflow-auto">
                        {!signedIn && !isPending ? (
                          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                            <p className="text-sm text-muted">
                              Directory is empty until you sign in.
                            </p>
                            <p className="max-w-sm text-[11px] text-subtle">
                              No demo listings are shown. Connect with 𝕏 to load
                              your graph and agent pay surfaces.
                            </p>
                            <Button asChild size="sm" className="mt-1">
                              <Link to="/login">
                                <XLogo className="size-3.5" />
                                <span className="ml-1.5">Sign in · Pay Link</span>
                              </Link>
                            </Button>
                          </div>
                        ) : (
                        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                          <thead className="sticky top-0 z-[1] bg-elevated/95 backdrop-blur">
                            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-subtle">
                              <th className="px-3 py-2 font-medium">Agent</th>
                              <th className="px-3 py-2 font-medium">
                                Money
                                <span className="ml-1 normal-case text-muted/50">(probe)</span>
                              </th>
                              <th className="hidden px-3 py-2 font-medium sm:table-cell">
                                Followers
                              </th>
                              <th className="hidden px-3 py-2 font-medium md:table-cell">
                                Rail
                              </th>
                              <th className="hidden px-3 py-2 font-medium lg:table-cell">
                                Harness
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                â˜…
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {slice.map((item) => (
                              <ListingTableRow
                                key={item.id}
                                item={item}
                                active={selected?.id === item.id}
                                starred={starred.includes(
                                  item.handle.toLowerCase(),
                                )}
                                onSelect={() => setSelectedId(item.id)}
                                onStar={() => toggleStar(item.handle)}
                                onAddToVibe={() => {
                                  const from =
                                    user?.handle ||
                                    loadXSession()?.handle ||
                                    "you";
                                  saveVibeInvite({
                                    fromHandle: from,
                                    toHandle: item.handle,
                                    listingId: item.id,
                                    payUrl: item.payUrl,
                                    note: item.bio || item.displayName,
                                  });
                                  saveMarketMode(true);
                                  toast.success(
                                    `VIBE · connected @${normalizeHandle(from)} → @${normalizeHandle(item.handle)}`,
                                  );
                                  void navigate({
                                    to: "/warp",
                                    search: {
                                      market: "1",
                                      vibe: normalizeHandle(item.handle),
                                    },
                                  });
                                }}
                              />
                            ))}
                          </tbody>
                        </table>
                        )}
                        {filtered.length === 0 && signedIn ? (
                          <p className="p-8 text-center text-sm text-muted">
                            No listings match.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 justify-center gap-2 border-t border-border py-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7"
                          disabled={!signedIn || safePage <= 0}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                          Prev
                        </Button>
                        <span className="flex items-center font-mono text-[10px] text-subtle">
                          {safePage + 1}/{pageCount}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7"
                          disabled={safePage >= pageCount - 1}
                          onClick={() =>
                            setPage((p) => Math.min(pageCount - 1, p + 1))
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </DashWindow>
                </Panel>
              </Group>
            </Panel>

            <Separator className="group flex w-1.5 items-center justify-center bg-border/40 transition hover:bg-augment/40">
              <div className="h-8 w-0.5 rounded-full bg-border-strong group-hover:bg-augment" />
            </Separator>

            {/* RIGHT column */}
            <Panel defaultSize={38} minSize={28} className="min-w-0">
              <Group orientation="vertical">
                <Panel defaultSize={28} minSize={12} collapsible>
                  <DashWindow
                    id="discover"
                    title="Discover"
                    subtitle={lane.toUpperCase()}
                    collapsed={collapsed.discover}
                    onToggle={() => togglePanel("discover")}
                  >
                    <div className="flex h-full min-h-0 flex-col gap-2 overflow-auto p-2">
                      <div className="flex gap-1.5">
                        <Input
                          value={discoverQ}
                          onChange={(e) => setDiscoverQ(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void runDiscover();
                          }}
                          placeholder={
                            lane === "agents"
                              ? "Agent pay, x402â€¦"
                              : lane === "defi"
                                ? "aave, jupiterâ€¦"
                                : "X Money, @handlesâ€¦"
                          }
                          className="h-8 flex-1 text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 bg-sky-700 text-white hover:bg-sky-600 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                          disabled={
                            discoverBusy ||
                            (lane === "agents" && !(tfStatus?.configured))
                          }
                          onClick={() => void runDiscover()}
                        >
                          {discoverBusy && !runningPluginId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Search className="size-3.5" />
                          )}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(lane === "defi"
                          ? WEB4_SEO.cryptoQueries
                          : WEB4_SEO.defaultQueries
                        ).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={discoverBusy}
                            onClick={() => {
                              setDiscoverQ(p.query);
                              void runDiscover({
                                query: p.query,
                                laneOverride: lane,
                                mode:
                                  "mode" in p && p.mode === "defi"
                                    ? "defi"
                                    : lane === "defi"
                                      ? "defi"
                                      : undefined,
                              });
                            }}
                            className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted hover:border-sky-500/40 hover:text-sky-800 dark:hover:border-cyan-500/40 dark:hover:text-cyan-200"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {/* Results compact */}
                      {discover?.results && discover.results.length > 0 ? (
                        <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
                          {discover.results.slice(0, 12).map((hit) => (
                            <li key={`${hit.position}-${hit.url}`}>
                              <a
                                href={hit.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate rounded border border-border/60 bg-bg/60 px-2 py-1 text-[11px] hover:border-cyan-500/40"
                              >
                                {hit.position}. {hit.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {cryptoHits?.assets && cryptoHits.assets.length > 0 ? (
                        <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
                          {cryptoHits.assets.slice(0, 12).map((a) => (
                            <li
                              key={`${a.source}-${a.id}`}
                              className="flex items-center gap-2 rounded border border-border/60 bg-bg/60 px-2 py-1 text-[11px]"
                            >
                              <span className="font-mono text-violet-700 dark:text-violet-300">
                                {a.symbol}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-muted">
                                {a.name}
                              </span>
                              <span className="font-mono text-subtle">
                                {formatUsd(a.priceUsd)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {lane === "x" ? (
                        <div className="rounded-lg border border-border bg-bg/50 p-2 text-[11px] text-muted">
                          {graph.source === "x-api" ? (
                            <p>
                              X graph · {graph.following.length} following ·{" "}
                              {graph.followers.length} followers
                              <br />
                              <span className="text-subtle">
                                Money ✓{moneyYes} confirmed · ✗{moneyNo} none · ?{moneyUnknown} unprobed
                                — graph ≠ X Money. Probe Money in Directory to resolve.
                              </span>
                            </p>
                          ) : (
                            <p>
                              {xOauth.accessToken
                                ? graph.error || "Graph load failed"
                                : "Authorize X graph for live follows"}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {!xOauth.accessToken ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-[10px]"
                                onClick={() => void xOauth.requestXToken()}
                                disabled={xOauth.isRequesting}
                              >
                                <XLogo className="size-3" />
                                <span className="ml-1">Authorize X</span>
                              </Button>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px]"
                                  disabled={graph.loading}
                                  onClick={() =>
                                    void graph.refresh({ probeMoney: false })
                                  }
                                >
                                  <RefreshCw className="size-3" />
                                  <span className="ml-1">Refresh graph</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px]"
                                  disabled={probingMoney}
                                  onClick={() => void probePageMoney()}
                                >
                                  <Wallet className="size-3" />
                                  <span className="ml-1">Probe Money</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </DashWindow>
                </Panel>

                <Separator className="group flex h-1.5 items-center justify-center bg-border/40 hover:bg-augment/40">
                  <div className="h-0.5 w-8 rounded-full bg-border-strong group-hover:bg-augment" />
                </Separator>

                <Panel defaultSize={72} minSize={30}>
                  <DashWindow
                    id="detail"
                    title="Pay card"
                    subtitle={
                      selected ? `@${selected.handle}` : "Select a row"
                    }
                    collapsed={collapsed.detail}
                    onToggle={() => togglePanel("detail")}
                  >
                    <div className="h-full min-h-0 space-y-2 overflow-auto p-2">
                      {!signedIn && !isPending ? (
                        <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                          <p className="text-sm text-muted">No pay card selected</p>
                          <p className="text-[11px] text-subtle">
                            Sign in to browse agents and open their pay rails.
                          </p>
                          <Button asChild size="sm" variant="secondary" className="mt-1">
                            <Link to="/login">
                              <XLogo className="size-3.5" />
                              <span className="ml-1.5">Sign in</span>
                            </Link>
                          </Button>
                        </div>
                      ) : selected ? (
                        <>
                          <AgentPayCard
                            item={selected}
                            starred={starred.includes(
                              selected.handle.toLowerCase(),
                            )}
                            onStar={() => toggleStar(selected.handle)}
                          />
                          <TinyFishPanel
                            handle={selected.handle}
                            configured={tfStatus?.configured ?? false}
                            mcp={
                              tfStatus?.mcp ?? "https://agent.tinyfish.ai/mcp"
                            }
                            keysUrl={
                              tfStatus?.keys ??
                              "https://agent.tinyfish.ai/api-keys"
                            }
                            docs={
                              tfStatus?.docs ??
                              "https://docs.tinyfish.ai/mcp-integration"
                            }
                            enriching={enriching}
                            last={lastEnrich}
                            onEnrich={(deep) =>
                              void runEnrich(selected.handle, deep)
                            }
                          />
                        </>
                      ) : (
                        <p className="p-8 text-center text-sm text-muted">
                          {isPending
                            ? "Loading session…"
                            : "Select a directory row."}
                        </p>
                      )}
                    </div>
                  </DashWindow>
                </Panel>
              </Group>
            </Panel>
          </Group>
      </div>
    </main>
  );
}

function DashWindow({
  id,
  title,
  subtitle,
  collapsed,
  onToggle,
  toolbar,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      data-panel={id}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border-strong/70 bg-surface shadow-panel"
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-elevated/70 px-2 py-1">
        <GripVertical
          className="size-3.5 shrink-0 cursor-grab text-subtle active:cursor-grabbing"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-fg">{title}</div>
          {subtitle ? (
            <div className="truncate font-mono text-[10px] text-subtle">
              {subtitle}
            </div>
          ) : null}
        </div>
        {toolbar}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-muted hover:bg-bg hover:text-fg"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <Maximize2 className="size-3.5" />
            ) : (
              <Minimize2 className="size-3.5" />
            )}
          </button>
        ) : null}
        <ChevronDown
          className={cn(
            "size-3.5 text-subtle transition",
            collapsed && "-rotate-90",
          )}
        />
      </div>
      {!collapsed ? (
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      ) : (
        <div className="px-3 py-2 text-[10px] text-subtle">Collapsed</div>
      )}
    </section>
  );
}

function ApiPluginTile({
  plugin,
  busy,
  onDiscover,
  compact = false,
}: {
  plugin: Web4ApiPlugin;
  busy: boolean;
  onDiscover: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-surface shadow-sm transition hover:border-sky-500/40 hover:bg-elevated/50 dark:bg-bg/70 dark:shadow-none dark:hover:border-cyan-500/35 dark:hover:bg-elevated/40",
        compact ? "p-2" : "p-3",
      )}
      style={{ borderTopColor: plugin.accent, borderTopWidth: 2 }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-start gap-2">
          {plugin.logo ? (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-elevated dark:border-white/10 dark:bg-black/40",
                compact ? "size-8" : "size-9",
              )}
              style={{ boxShadow: `inset 0 0 0 1px ${plugin.accent}33` }}
            >
              <img
                src={plugin.logo}
                alt=""
                className={cn(
                  "object-contain",
                  compact ? "size-5" : "size-6",
                )}
                loading="lazy"
                decoding="async"
              />
            </span>
          ) : null}
          <div className="min-w-0">
            <div
              className={cn(
                "truncate font-semibold text-fg",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {plugin.name}
            </div>
            <div className="truncate font-mono text-[9px] text-subtle">
              {plugin.brand}
            </div>
          </div>
        </div>
        <a
          href={plugin.href}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-muted hover:text-sky-700 dark:hover:text-cyan-300"
          title="Open plugin"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="size-3" />
        </a>
      </div>
      <p
        className={cn(
          "mt-1 flex-1 leading-snug text-muted",
          compact ? "line-clamp-2 text-[10px]" : "line-clamp-2 text-[11px]",
        )}
      >
        {plugin.blurb}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 flex-1 border-sky-600/35 text-[10px] text-fg dark:border-cyan-500/30"
          disabled={busy}
          onClick={onDiscover}
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Search className="size-3" />
          )}
          <span className="ml-1">Run</span>
        </Button>
        {plugin.docs ? (
          <Button asChild size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]">
            <a href={plugin.docs} target="_blank" rel="noreferrer">
              Docs
            </a>
          </Button>
        ) : null}
        {plugin.mcp ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[10px] text-subtle"
            onClick={() => {
              void copyText(plugin.mcp!).then(() =>
                toast.success(`${plugin.name} MCP URL copied`),
              );
            }}
          >
            MCP
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function MoneyBadge({ value }: { value?: boolean | null }) {
  if (value === true) {
    return (
      <Badge
        className="border-emerald-600/40 bg-emerald-500/15 font-mono text-[10px] text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-300"
        title="X Money pay surface detected (TinyFish / HTML probe)"
      >
        ✓ Money
      </Badge>
    );
  }
  if (value === false) {
    return (
      <Badge
        variant="outline"
        className="border-rose-600/35 font-mono text-[10px] text-rose-700 dark:border-rose-500/30 dark:text-rose-400/80"
        title="Probed — no X Money pay surface found for this handle"
      >
        ✗ No Money
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="cursor-help border-dashed font-mono text-[10px] text-muted"
      title="Not probed yet. Click 'Probe Money' to check. X has no public API for Money enrollment."
    >
      ? Unprobed
    </Badge>
  );
}

function ListingTableRow({
  item,
  active,
  starred,
  onSelect,
  onStar,
  onAddToVibe,
}: {
  item: AugmentListing;
  active: boolean;
  starred: boolean;
  onSelect: () => void;
  onStar: () => void;
  onAddToVibe?: () => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const menuEl =
    menu && typeof document !== "undefined"
      ? createPortal(
          <div
            role="menu"
            className="fixed z-[90] min-w-[200px] overflow-hidden rounded-lg border border-augment/40 bg-surface py-1 font-mono shadow-xl"
            style={{
              left: Math.min(menu.x, window.innerWidth - 220),
              top: Math.min(menu.y, window.innerHeight - 200),
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-[11px] text-fg hover:bg-augment/15"
              onClick={() => {
                setMenu(null);
                onAddToVibe?.();
              }}
            >
              Add to VIBE · connect nodes
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-[11px] text-muted hover:bg-elevated"
              onClick={() => {
                setMenu(null);
                onSelect();
              }}
            >
              Open pay card
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-[11px] text-muted hover:bg-elevated"
              onClick={() => {
                void navigator.clipboard.writeText(`@${item.handle}`);
                setMenu(null);
                toast.success(`Copied @${item.handle}`);
              }}
            >
              Copy @handle
            </button>
            {item.payUrl ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-3 py-2 text-left text-[11px] text-muted hover:bg-elevated"
                onClick={() => {
                  void navigator.clipboard.writeText(item.payUrl!);
                  setMenu(null);
                  toast.success("Copied pay link");
                }}
              >
                Copy pay link
              </button>
            ) : null}
            <a
              role="menuitem"
              href={`https://x.com/${item.handle}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full px-3 py-2 text-left text-[11px] text-muted hover:bg-elevated"
              onClick={() => setMenu(null)}
            >
              Open on X ↗
            </a>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {menuEl}
    <tr
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer border-b border-border/70 transition-colors last:border-0 ${
        active
          ? "bg-augment/10"
          : "hover:bg-elevated/50"
      }`}
    >
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <AvatarBubble item={item} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-medium text-fg">
                {item.displayName}
              </span>
              {item.featured ? (
                <Sparkles className="size-3 shrink-0 text-augment" />
              ) : null}
              {item.live ? (
                <span
                  className="rounded bg-sky-500/15 px-1 font-mono text-[9px] uppercase text-sky-800 dark:text-sky-300"
                  title="From your X following/followers graph — not X Money status"
                >
                  graph
                </span>
              ) : null}
            </div>
            <div className="font-mono text-[11px] text-muted">
              @{item.handle}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <MoneyBadge value={item.hasXMoney} />
      </td>
      <td className="hidden px-3 py-2.5 font-mono text-xs text-muted sm:table-cell">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3 opacity-60" />
          {formatCompact(item.followers)}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 font-mono text-xs text-muted md:table-cell">
        {item.defaultAmount
          ? `${item.defaultAmount} ${item.asset}`
          : <span className="text-subtle/50">—</span>}
      </td>
      <td className="hidden max-w-[10rem] truncate px-3 py-2.5 font-mono text-[10px] text-subtle lg:table-cell">
        {item.harnesses.length > 0
          ? item.harnesses.join(" · ")
          : <span className="text-muted/40">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          className="text-muted hover:text-augment"
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          aria-label={starred ? "Unstar" : "Star"}
        >
          <Star
            className={`size-3.5 ${starred ? "fill-augment text-augment" : ""}`}
          />
        </button>
      </td>
    </tr>
    </>
  );
}

function AgentPayCard({
  item,
  starred,
  onStar,
}: {
  item: AugmentListing;
  starred: boolean;
  onStar: () => void;
}) {
  return (
    <Card className="overflow-hidden border-augment/25">
      <div
        className="h-1.5 w-full"
        style={{ background: item.accent ?? "var(--color-augment)" }}
      />
      <CardHeader>
        <div className="flex items-start gap-3">
          <AvatarBubble item={item} large />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">{item.displayName}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-1.5 font-mono">
              @{item.handle}
              <MoneyBadge value={item.hasXMoney} />
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={onStar}
            className="text-muted hover:text-augment"
            aria-label={starred ? "Unstar" : "Star"}
          >
            <Star
              className={`size-4 ${starred ? "fill-augment text-augment" : ""}`}
            />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{item.bio}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border bg-bg p-2">
            <div className="text-subtle">Followers</div>
            <div className="mt-0.5 font-mono text-fg">
              {formatCompact(item.followers)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-bg p-2">
            <div className="text-subtle">Following</div>
            <div className="mt-0.5 font-mono text-fg">
              {formatCompact(item.following)}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-subtle">
            <Wallet className="size-3" />
            Agent pay card Â· {item.kind}
          </div>
          <p className="mt-2 break-all font-mono text-xs text-fg">
            {item.payUrl}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.defaultAmount ? (
              <Badge variant="outline" className="font-mono">
                {item.defaultAmount} {item.asset}
              </Badge>
            ) : (
              <Badge variant="outline" className="font-mono text-muted/50">
                amount unknown
              </Badge>
            )}
            <Badge variant="outline" className="font-mono">
              {item.network}
            </Badge>
            {item.harnesses.length > 0 ? (
              item.harnesses.map((h) => (
                <Badge key={h} variant="default" className="gap-1">
                  <Bot className="size-3" />
                  {h}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="font-mono text-muted/50">
                harness unknown
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              void copyText(item.payUrl).then(() =>
                toast.success("Pay link copied"),
              );
            }}
          >
            Copy pay link
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <a
              href={item.payUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5"
            >
              <XLogo className="size-3.5" />
              Open on X
              <ExternalLink className="size-3.5 opacity-70" />
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-augment/40 text-augment hover:bg-augment/10"
            onClick={() => {
              void copyText(
                `Page @${item.handle} via X Wealth x402 · ${item.payUrl}${item.defaultAmount ? ` · ${item.defaultAmount} USDC Solana` : " · Solana"}`,
              ).then(() => toast.success("Agent page payload copied"));
            }}
          >
            Copy agent page payload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TinyFishPanel({
  handle,
  configured,
  mcp,
  keysUrl,
  docs,
  enriching,
  last,
  onEnrich,
}: {
  handle: string;
  configured: boolean;
  mcp: string;
  keysUrl: string;
  docs: string;
  enriching: boolean;
  last: EnrichPayload | null;
  onEnrich: (deep: boolean) => void;
}) {
  return (
    <Card className="border-sky-600/25 dark:border-cyan-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Fish className="size-4 text-sky-700 dark:text-cyan-400" />
          TinyFish agent
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Fetch X profile logos + Money surfaces via{" "}
          <a
            href={docs}
            target="_blank"
            rel="noreferrer"
            className="text-sky-800 underline-offset-2 hover:underline dark:text-cyan-400/90"
          >
            TinyFish MCP / Fetch API
          </a>
          . Harnesses connect at{" "}
          <code className="text-[10px] text-fg/80">{mcp}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!configured ? (
          <div className="rounded-lg border border-amber-600/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/25 dark:text-amber-100/90">
            Server key missing. Set{" "}
            <code className="text-amber-950 dark:text-amber-50">TINYFISH_API_KEY</code> in Vercel /
            .env.local, then redeploy.{" "}
            <a
              href={keysUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Get a key
            </a>
          </div>
        ) : (
          <p className="text-[11px] text-subtle">
            Key configured Â· free Fetch enrich for @{handle}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            className="w-full bg-sky-700 text-white hover:bg-sky-600 dark:bg-cyan-600 dark:hover:bg-cyan-500"
            disabled={!configured || enriching}
            onClick={() => onEnrich(false)}
          >
            {enriching ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Fish className="size-3.5" />
            )}
            <span className="ml-1.5">Enrich @{handle}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full border-cyan-500/30"
            disabled={!configured || enriching}
            onClick={() => onEnrich(true)}
          >
            Deep Money probe (agent credits)
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full text-xs text-muted"
            onClick={() => {
              void copyText(mcp).then(() =>
                toast.success("TinyFish MCP URL copied"),
              );
            }}
          >
            Copy MCP URL for Grok / Claude / Cursor
          </Button>
        </div>

        {last?.enrichment ? (
          <div className="rounded-lg border border-border bg-bg p-2.5 text-[11px] leading-relaxed text-muted">
            <div className="font-mono text-fg">
              {last.enrichment.source} Â· Money=
              {last.enrichment.hasXMoney === null
                ? "?"
                : String(last.enrichment.hasXMoney)}
            </div>
            {last.enrichment.evidence?.map((line) => (
              <div key={line} className="mt-0.5 text-subtle">
                Â· {line}
              </div>
            ))}
          </div>
        ) : null}
        {last?.error && !last.enrichment ? (
          <p className="text-[11px] text-amber-400/90">
            {last.message || last.error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AvatarBubble({
  item,
  large,
}: {
  item: AugmentListing;
  large?: boolean;
}) {
  const size = large ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  const src = avatarProxyUrl(item.avatarUrl);
  const [failed, setFailed] = useState(false);

  // Reset fail state when avatar URL changes
  useEffect(() => {
    setFailed(false);
  }, [item.avatarUrl]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`@${item.handle}`}
        width={large ? 48 : 40}
        height={large ? 48 : 40}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`${size} shrink-0 rounded-full border border-border object-cover`}
      />
    );
  }

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full border border-border font-mono font-semibold ${size}`}
      style={{
        background: `color-mix(in oklab, ${item.accent ?? "var(--color-augment)"} 18%, transparent)`,
        color: item.accent ?? "var(--color-augment)",
      }}
    >
      {monogram(item.handle)}
    </div>
  );
}
