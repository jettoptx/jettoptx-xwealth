/**
 * WARP market cards — glass popouts over graph/MDX field.
 * Left wire-map panel hosts clickable pop-in / pop-out controls.
 * Same React tree as graph (Privy session shared — no iframe).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  AUGMENT_SEED,
  filterListings,
  formatCompact,
  mergeLiveGraph,
  type AugmentListing,
} from "@/lib/augments";
import {
  loadXSession,
  normalizeHandle,
  saveMarketMode,
  saveVibeInvite,
} from "@/lib/augment-marketplace";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useXOAuthAccess } from "@/lib/auth/x-oauth-tokens";
import { useSocialGraph } from "@/lib/use-social-graph";
import { WEB4_API_PLUGINS } from "@/lib/web4-seo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XLogo } from "@/components/brand-icons";

export type MarketCardId = "plugins" | "directory" | "discover" | "pay";

export const MARKET_CARD_META: {
  id: MarketCardId;
  label: string;
  short: string;
}[] = [
  { id: "plugins", label: "API plugins", short: "API" },
  { id: "directory", label: "Directory", short: "DIR" },
  { id: "discover", label: "Discover", short: "SEO" },
  { id: "pay", label: "Pay card", short: "PAY" },
];

const LS_VISIBLE = "xwealth-warp-market-cards-v2";
const LS_LAYOUT = "xwealth-warp-market-layout-v2";

type Layout = Record<
  MarketCardId,
  { x: number; y: number; w: number; h: number }
>;

/** Default positions clear of left wire dock (~180px) */
const DEFAULT_LAYOUT: Layout = {
  plugins: { x: 200, y: 72, w: 400, h: 190 },
  directory: { x: 200, y: 280, w: 400, h: 300 },
  discover: { x: 620, y: 72, w: 320, h: 200 },
  pay: { x: 620, y: 290, w: 320, h: 280 },
};

function loadVisible(): Record<MarketCardId, boolean> {
  try {
    const raw = localStorage.getItem(LS_VISIBLE);
    if (raw) {
      return {
        plugins: false,
        directory: false,
        discover: false,
        pay: false,
        ...JSON.parse(raw),
      };
    }
  } catch {
    /* ignore */
  }
  // Default all off so MDX/graph field stays fully visible until pop-out
  return { plugins: false, directory: false, discover: false, pay: false };
}

function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(LS_LAYOUT);
    if (raw) return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_LAYOUT };
}

/** Glass morphism — translucent so Asciify/MDX field shows through */
const GLASS =
  "border border-white/20 bg-black/35 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl";

/**
 * Hosted inside left wire-map dock — click to pop out / pop in glass cards.
 */
export function MarketCardPanelControls({
  visible,
  onToggle,
  onResetLayout,
  focusLabel,
  hiddenCount = 0,
  onRestoreHidden,
}: {
  visible: Record<MarketCardId, boolean>;
  onToggle: (id: MarketCardId) => void;
  onResetLayout: () => void;
  /** Live graph selection hint (e.g. @handle) */
  focusLabel?: string | null;
  /** How many market nodes the user removed (local hide) */
  hiddenCount?: number;
  onRestoreHidden?: () => void;
}) {
  const anyOut = MARKET_CARD_META.some((c) => visible[c.id]);
  return (
    <div className="border-t border-white/10 px-1.5 py-1.5" data-no-drag>
      <p className="mb-0.5 px-1 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-orange-300/80">
        Cards · Pop out
      </p>
      <p className="mb-1.5 px-1 font-mono text-[7px] leading-snug text-white/35">
        Toggle glass cards over the graph. Click mini-map nodes to focus.
        Drag the dock header to move this panel.
      </p>
      {focusLabel ? (
        <div className="mb-1.5 truncate rounded-md border border-orange-400/35 bg-orange-500/15 px-1.5 py-1 font-mono text-[8px] text-orange-100">
          Focus · {focusLabel}
        </div>
      ) : null}
      {hiddenCount > 0 && onRestoreHidden ? (
        <button
          type="button"
          onClick={onRestoreHidden}
          className="mb-1.5 w-full rounded-md border border-sky-400/35 bg-sky-500/10 px-1.5 py-1 font-mono text-[8px] text-sky-100 hover:bg-sky-500/20"
        >
          Restore {hiddenCount} removed node{hiddenCount === 1 ? "" : "s"}
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-1">
        {MARKET_CARD_META.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            title={
              visible[c.id]
                ? `Hide ${c.label}`
                : `Show ${c.label} (glass over field)`
            }
            className={cn(
              "rounded-lg border px-1 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-wide transition",
              visible[c.id]
                ? "border-orange-400/50 bg-orange-500/20 text-orange-100 shadow-[0_0_12px_rgba(255,98,0,0.25)]"
                : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/25 hover:text-white/75",
            )}
          >
            {c.short}
            <span className="mt-0.5 block text-[7px] font-normal normal-case tracking-normal opacity-70">
              {visible[c.id] ? "open" : "closed"}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        <button
          type="button"
          onClick={onResetLayout}
          className="flex-1 rounded border border-white/8 py-0.5 font-mono text-[7px] text-white/30 hover:text-white/55"
        >
          Reset layout
        </button>
        {anyOut ? (
          <button
            type="button"
            onClick={() => {
              for (const c of MARKET_CARD_META) {
                if (visible[c.id]) onToggle(c.id);
              }
            }}
            className="flex-1 rounded border border-white/8 py-0.5 font-mono text-[7px] text-white/30 hover:text-rose-200/70"
          >
            Close all
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function useWarpMarketCardState() {
  const [visible, setVisible] = useState(loadVisible);
  const [layout, setLayout] = useState(loadLayout);

  useEffect(() => {
    try {
      localStorage.setItem(LS_VISIBLE, JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_LAYOUT, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, [layout]);

  const toggle = useCallback((id: MarketCardId) => {
    setVisible((v) => ({ ...v, [id]: !v[id] }));
  }, []);

  /** Force-open (does not close if already open) */
  const open = useCallback((id: MarketCardId) => {
    setVisible((v) => (v[id] ? v : { ...v, [id]: true }));
  }, []);

  const openMany = useCallback((ids: MarketCardId[]) => {
    setVisible((v) => {
      let changed = false;
      const next = { ...v };
      for (const id of ids) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : v;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout({ ...DEFAULT_LAYOUT });
  }, []);

  const setCardLayout = useCallback(
    (id: MarketCardId, patch: Partial<Layout[MarketCardId]>) => {
      setLayout((L) => ({ ...L, [id]: { ...L[id], ...patch } }));
    },
    [],
  );

  return { visible, layout, toggle, open, openMany, resetLayout, setCardLayout };
}

/** Peer/pay focus from graph click (bridged into glass cards) */
export type MarketFocusPeer = {
  handle: string;
  payUrl?: string | null;
  note?: string | null;
  kind?: "peer" | "pay" | "you" | "skills" | "other";
};

export function WarpMarketFloatingCards({
  visible,
  layout,
  onToggle,
  onLayout,
  focusPeer = null,
}: {
  visible: Record<MarketCardId, boolean>;
  layout: Layout;
  onToggle: (id: MarketCardId) => void;
  onLayout: (
    id: MarketCardId,
    patch: Partial<Layout[MarketCardId]>,
  ) => void;
  /** When graph node is clicked, parent passes peer so pay/directory sync */
  focusPeer?: MarketFocusPeer | null;
}) {
  const { user, isPending } = useCurrentUserState();
  const signedIn = Boolean(user && !user.isDevFallback);
  const navigate = useNavigate();
  const xOauth = useXOAuthAccess();
  const graph = useSocialGraph(signedIn ? xOauth.accessToken : null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const catalog = useMemo(() => {
    if (!signedIn) return [] as AugmentListing[];
    return mergeLiveGraph(AUGMENT_SEED, {
      following: graph.following,
      followers: graph.followers,
    });
  }, [signedIn, graph.following, graph.followers]);

  const filtered = useMemo(
    () => filterListings(catalog, { tab: "all", query, tag: null }),
    [catalog, query],
  );

  // Graph click → select matching directory row (or synthetic focus listing)
  useEffect(() => {
    if (!focusPeer?.handle) return;
    const h = normalizeHandle(focusPeer.handle).toLowerCase();
    const hit = catalog.find(
      (x) => normalizeHandle(x.handle).toLowerCase() === h,
    );
    if (hit) {
      setSelectedId(hit.id);
      return;
    }
    setSelectedId(`graph-focus:${h}`);
  }, [focusPeer?.handle, catalog]);

  const selected = useMemo((): AugmentListing | null => {
    if (selectedId != null) {
      const fromCatalog = catalog.find((x) => x.id === selectedId);
      if (fromCatalog) return fromCatalog;
    }
    if (focusPeer?.handle) {
      const h = normalizeHandle(focusPeer.handle);
      const fromCatalog = catalog.find(
        (x) => normalizeHandle(x.handle).toLowerCase() === h.toLowerCase(),
      );
      if (fromCatalog) return fromCatalog;
      // Synthetic listing from graph selection (VIBE / seed peer)
      return {
        id: `graph-focus:${h.toLowerCase()}`,
        handle: h,
        displayName: `@${h}`,
        bio: focusPeer.note || "Graph selection · marketplace peer",
        payUrl:
          focusPeer.payUrl ||
          `https://x.com/i/money/pay/${encodeURIComponent(h)}`,
        kind: "pay",
        defaultAmount: "1",
        network: "solana",
        asset: "USDC",
        harnesses: ["grok-build", "hermes"],
        followers: 0,
        following: 0,
        tags: ["graph", focusPeer.kind || "peer"],
        hasXMoney: null,
      };
    }
    return null;
  }, [selectedId, catalog, focusPeer]);

  const onVibe = (item: AugmentListing) => {
    const from = user?.handle || loadXSession()?.handle || "you";
    saveVibeInvite({
      fromHandle: from,
      toHandle: item.handle,
      listingId: item.id,
      payUrl: item.payUrl,
      note: item.bio || item.displayName,
    });
    saveMarketMode(true);
    toast.success(
      `VIBE · @${normalizeHandle(from)} → @${normalizeHandle(item.handle)}`,
    );
  };

  return (
    <>
      {visible.plugins && (
        <GlassFloatCard
          title="API plugins"
          layout={layout.plugins}
          onLayout={(p) => onLayout("plugins", p)}
          onClose={() => onToggle("plugins")}
        >
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {WEB4_API_PLUGINS.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2 py-1.5 backdrop-blur-sm"
              >
                {p.logo ? (
                  <img
                    src={p.logo}
                    alt=""
                    className="mt-0.5 size-5 shrink-0 rounded object-contain"
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] font-semibold text-white/90">
                    {p.name}
                  </p>
                  <p className="truncate font-mono text-[8px] text-white/45">
                    {p.blurb?.slice(0, 48) ?? p.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassFloatCard>
      )}

      {visible.directory && (
        <GlassFloatCard
          title="Directory"
          layout={layout.directory}
          onLayout={(p) => onLayout("directory", p)}
          onClose={() => onToggle("directory")}
        >
          {!signedIn && !isPending ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <p className="text-[11px] text-white/55">
                Sign in to load your graph
              </p>
              <Button
                type="button"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => void navigate({ to: "/login" })}
              >
                <XLogo className="size-3" />
                <span className="ml-1">Sign in</span>
              </Button>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-white/10 p-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-white/30" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    className="h-7 border-white/15 bg-black/30 pl-7 text-[10px] text-white backdrop-blur-sm"
                  />
                </div>
              </div>
              <ul className="thin-scroll min-h-0 flex-1 overflow-y-auto p-1">
                {filtered.slice(0, 40).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onVibe(item);
                        setSelectedId(item.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/10",
                        selectedId === item.id && "bg-orange-500/20",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/85">
                        @{item.handle}
                      </span>
                      <span className="shrink-0 font-mono text-[8px] text-white/40">
                        {formatCompact(item.followers)}
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="p-4 text-center font-mono text-[10px] text-white/40">
                    No listings
                  </li>
                )}
              </ul>
              <p className="shrink-0 border-t border-white/10 px-2 py-1 font-mono text-[8px] text-white/35">
                Right-click → VIBE
              </p>
            </div>
          )}
        </GlassFloatCard>
      )}

      {visible.discover && (
        <GlassFloatCard
          title="Discover"
          layout={layout.discover}
          onLayout={(p) => onLayout("discover", p)}
          onClose={() => onToggle("discover")}
        >
          <div className="space-y-2 p-2 font-mono text-[10px] text-white/60">
            <p>Web4 agent SEO · glass over field</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-full border-white/20 bg-white/5 text-[10px] text-white/75 backdrop-blur-sm"
              onClick={() =>
                void navigate({ to: "/augments", search: { embed: undefined } })
              }
            >
              Full Discover (SPA)
            </Button>
          </div>
        </GlassFloatCard>
      )}

      {visible.pay && (
        <GlassFloatCard
          title={selected ? `Pay · @${selected.handle}` : "Pay card"}
          layout={layout.pay}
          onLayout={(p) => onLayout("pay", p)}
          onClose={() => onToggle("pay")}
        >
          {!signedIn && !isPending ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <p className="text-[11px] text-white/50">No pay card</p>
              <Button
                type="button"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => void navigate({ to: "/login" })}
              >
                Sign in
              </Button>
            </div>
          ) : selected ? (
            <div className="space-y-2 overflow-auto p-3 font-mono text-[10px]">
              <p className="text-sm font-semibold text-white">
                {selected.displayName}
              </p>
              <p className="text-orange-200/90">@{selected.handle}</p>
              <p className="text-white/50">{selected.bio}</p>
              <div className="flex flex-wrap gap-1">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] text-emerald-100">
                  {selected.asset} · {selected.network}
                </span>
                {(selected.harnesses ?? []).map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[8px] text-violet-100"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <p className="break-all text-[9px] text-sky-300/85">
                {selected.payUrl}
              </p>
              <p className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[8px] leading-snug text-white/45">
                Local harness dry-run only · agent attaches USDC signature on
                Solana. LIVE settle stays off until you explicitly enable it.
              </p>
              <Button
                type="button"
                size="sm"
                className="h-7 w-full text-[10px]"
                onClick={() => {
                  void navigator.clipboard.writeText(selected.payUrl);
                  toast.success("Copied pay link");
                }}
              >
                Copy pay link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-full border-orange-500/35 bg-orange-500/10 text-[10px] text-orange-100"
                onClick={() => onVibe(selected)}
              >
                Add to VIBE
              </Button>
            </div>
          ) : (
            <p className="p-6 text-center text-[11px] text-white/40">
              Click a peer or pay node on the graph — or pick a directory row
            </p>
          )}
        </GlassFloatCard>
      )}
    </>
  );
}

function GlassFloatCard({
  title,
  layout,
  onLayout,
  onClose,
  children,
}: {
  title: string;
  layout: { x: number; y: number; w: number; h: number };
  onLayout: (p: Partial<{ x: number; y: number; w: number; h: number }>) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dragRef = useRef<{
    kind: "move" | "resize";
    mx: number;
    my: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "move") {
        onLayout({
          x: Math.max(0, d.ox + (e.clientX - d.mx)),
          y: Math.max(48, d.oy + (e.clientY - d.my)),
        });
      } else {
        onLayout({
          w: Math.min(720, Math.max(220, d.ow + (e.clientX - d.mx))),
          h: Math.min(560, Math.max(140, d.oh + (e.clientY - d.my))),
        });
      }
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, onLayout]);

  return (
    <div
      className={cn(
        "pointer-events-auto fixed z-[55] flex flex-col overflow-hidden rounded-2xl transition",
        GLASS,
        dragging && "border-orange-400/55 shadow-[0_0_24px_rgba(255,98,0,0.2)]",
      )}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.w,
        height: layout.h,
      }}
    >
      <div
        className="flex shrink-0 cursor-grab items-center justify-between gap-2 border-b border-white/15 bg-white/[0.06] px-2.5 py-1.5 active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          dragRef.current = {
            kind: "move",
            mx: e.clientX,
            my: e.clientY,
            ox: layout.x,
            oy: layout.y,
            ow: layout.w,
            oh: layout.h,
          };
          setDragging(true);
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
        }}
      >
        <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-wide text-white/85">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-white/45 hover:bg-white/10 hover:text-white"
          aria-label={`Pop in ${title}`}
          title="Pop in (hide card)"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-hidden bg-black/20">
        {children}
      </div>
      <div
        role="separator"
        aria-label="Resize"
        title="Drag to resize"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = {
            kind: "resize",
            mx: e.clientX,
            my: e.clientY,
            ox: layout.x,
            oy: layout.y,
            ow: layout.w,
            oh: layout.h,
          };
          setDragging(true);
          document.body.style.cursor = "nwse-resize";
          document.body.style.userSelect = "none";
        }}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="absolute bottom-0.5 right-0.5 text-white/40"
          aria-hidden
        >
          <path
            d="M9 1v8H1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      </div>
    </div>
  );
}
