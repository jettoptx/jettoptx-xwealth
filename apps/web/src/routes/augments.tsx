import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Copy,
  ExternalLink,
  Link2,
  Map as MapIcon,
  Search,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";
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
import {
  AUGMENT_SEED,
  MARKETPLACE_TAGS,
  filterListings,
  formatCompact,
  monogram,
  type AugmentListing,
} from "@/lib/augments";
import {
  formatProofShareLine,
  formatProofStrip,
  normalizeHandle,
  proofsForHandle,
  type MoaPublicProof,
} from "@/lib/moa-graph";
import { hasMoaLink, useWealthStore } from "@/lib/store";
import {
  linkFollowLocal,
  publishDelegatePrivate,
} from "@/lib/notr-relay";
import { copyText } from "@/lib/utils";
import { XLogo } from "@/components/brand-icons";
import { MoaMapView } from "@/components/moa-map";
import { useCurrentUser } from "@/lib/auth/use-current-user";

type AugmentsSearch = {
  view?: "list" | "map";
  highlight?: string;
};

export const Route = createFileRoute("/augments")({
  validateSearch: (search: Record<string, unknown>): AugmentsSearch => ({
    view: search.view === "map" ? "map" : search.view === "list" ? "list" : undefined,
    highlight:
      typeof search.highlight === "string" ? search.highlight : undefined,
  }),
  component: AugmentsPage,
});

type TabId = "all" | "following" | "followers" | "featured";
type ViewMode = "list" | "map";

const PAGE_SIZE = 6;

function AugmentsPage() {
  const navigate = useNavigate({ from: "/augments" });
  const search = Route.useSearch();
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<ViewMode>(search.view ?? "list");
  const [selected, setSelected] = useState<AugmentListing | null>(
    AUGMENT_SEED.find((x) => x.handle === "jettoptx") ?? AUGMENT_SEED[0],
  );
  const [activeProof, setActiveProof] = useState<MoaPublicProof | null>(null);

  const starred = useWealthStore((s) => s.starredAugments);
  const toggleStar = useWealthStore((s) => s.toggleStarAugment);
  const moaLinks = useWealthStore((s) => s.moaLinks);
  const moaProofs = useWealthStore((s) => s.moaProofs);

  useEffect(() => {
    if (search.view === "map" || search.view === "list") {
      setView(search.view);
    }
  }, [search.view]);

  useEffect(() => {
    if (!search.highlight) return;
    const proof = moaProofs.find((p) => p.id === search.highlight) ?? null;
    setActiveProof(proof);
    if (proof) {
      const listing =
        AUGMENT_SEED.find(
          (x) =>
            normalizeHandle(x.handle) === normalizeHandle(proof.payeeHandle),
        ) ?? null;
      if (listing) setSelected(listing);
      setView("map");
    }
  }, [search.highlight, moaProofs]);

  const filtered = useMemo(
    () => filterListings(AUGMENT_SEED, { tab, query, tag }),
    [tab, query, tag],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  function setViewMode(next: ViewMode) {
    setView(next);
    void navigate({
      search: (prev) => ({
        ...prev,
        view: next,
      }),
    });
  }

  function selectByHandle(handle: string) {
    const listing =
      AUGMENT_SEED.find(
        (x) => normalizeHandle(x.handle) === normalizeHandle(handle),
      ) ?? null;
    if (listing) setSelected(listing);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-augment">
            Marketplace · Map of Augments
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Augments
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Nodes are X-linked agent pay cards. Edges are follows, delegates, and
            Space Cowboy pay proofs — amounts stay private by default.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "secondary" : "ghost"}
              className="h-8"
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "map" ? "secondary" : "ghost"}
              className="h-8 gap-1.5"
              onClick={() => setViewMode("map")}
            >
              <MapIcon className="size-3.5" />
              Map
            </Button>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/console">List your pay card</Link>
          </Button>
        </div>
      </div>

      {activeProof && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-augment/30 bg-augment/8 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-augment">
              Public proof · amount truncated
            </div>
            <p className="mt-0.5 font-mono text-xs text-fg sm:text-sm">
              {formatProofStrip(activeProof)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-augment/40"
              onClick={() => {
                void copyText(formatProofShareLine(activeProof)).then(() =>
                  toast.success("Proof share line copied"),
                );
              }}
            >
              <Copy className="size-3.5" />
              Share
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setActiveProof(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {view === "map" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Map of Augments</CardTitle>
              <CardDescription>
                Dim edges = follow · OPTX orange = paid / delegate. Click a node
                for the pay card; click an edge for the proof strip.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MoaMapView
                links={moaLinks}
                proofs={moaProofs}
                highlightProofId={search.highlight}
                selectedHandle={selected?.handle}
                onSelectHandle={selectByHandle}
                onSelectProof={setActiveProof}
              />
            </CardContent>
          </Card>
          <div className="lg:sticky lg:top-20 lg:self-start">
            {selected ? (
              <AgentPayCard
                item={selected}
                starred={starred.includes(selected.handle.toLowerCase())}
                onStar={() => toggleStar(selected.handle)}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted">
                  Select a node to open their agent pay card.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search @handle, name, tag…"
                className="pl-9"
              />
            </div>
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as TabId);
                setPage(0);
              }}
            >
              <TabsList className="flex h-auto flex-wrap">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="following">Following</TabsTrigger>
                <TabsTrigger value="followers">Followers</TabsTrigger>
                <TabsTrigger value="featured">Featured</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTag(null);
                setPage(0);
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                !tag
                  ? "border-augment/50 bg-augment/15 text-augment"
                  : "border-border text-muted hover:bg-elevated"
              }`}
            >
              all tags
            </button>
            {MARKETPLACE_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTag(tag === t ? null : t);
                  setPage(0);
                }}
                className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  tag === t
                    ? "border-augment/50 bg-augment/15 text-augment"
                    : "border-border text-muted hover:bg-elevated"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-subtle">
                <span>
                  {filtered.length} listing{filtered.length === 1 ? "" : "s"}
                  {tab !== "all" ? ` · ${tab}` : ""}
                </span>
                <span className="font-mono">
                  page {safePage + 1}/{pageCount}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {slice.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    active={selected?.id === item.id}
                    starred={starred.includes(item.handle.toLowerCase())}
                    onSelect={() => setSelected(item)}
                    onStar={() => toggleStar(item.handle)}
                  />
                ))}
              </div>

              {filtered.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted">
                    No listings match. Try another tab or clear search.
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              {selected ? (
                <AgentPayCard
                  item={selected}
                  starred={starred.includes(selected.handle.toLowerCase())}
                  onStar={() => toggleStar(selected.handle)}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted">
                    Select a listing to open their agent pay card.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function ListingCard({
  item,
  active,
  starred,
  onSelect,
  onStar,
}: {
  item: AugmentListing;
  active: boolean;
  starred: boolean;
  onSelect: () => void;
  onStar: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${
        active
          ? "border-augment/45 bg-augment/7 shadow-sm"
          : "border-border bg-surface hover:border-border-strong hover:bg-elevated/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <AvatarBubble item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-sm font-semibold">
              {item.displayName}
            </span>
            {item.featured && (
              <Sparkles className="size-3 shrink-0 text-augment" />
            )}
          </div>
          <div className="font-mono text-xs text-muted">@{item.handle}</div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-subtle">
            {item.bio}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-subtle">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" />
              {formatCompact(item.followers)}
            </span>
            <span className="font-mono uppercase">{item.asset}</span>
            <span className="font-mono">{item.defaultAmount}</span>
            <button
              type="button"
              className="ml-auto text-muted hover:text-augment"
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
          </div>
        </div>
      </div>
    </div>
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
  const user = useCurrentUser();
  const money = useWealthStore((s) => s.money);
  const moaLinks = useWealthStore((s) => s.moaLinks);
  const moaProofs = useWealthStore((s) => s.moaProofs);
  const me =
    money?.handle || user?.handle || "space-cowboy";
  const linked = hasMoaLink(moaLinks, me, item.handle, "follow");
  const recent = proofsForHandle(moaProofs, item.handle).slice(0, 4);

  async function onLink() {
    linkFollowLocal(me, item.handle);
    toast.success(`Linked @${me} → @${item.handle} on Map of Augments`);
  }

  async function onDelegate() {
    await publishDelegatePrivate({
      fromHandle: me,
      toHandle: item.handle,
      memo: "Map of Augments delegate",
      x402ReceiptId: `delegate_${Date.now().toString(36)}`,
    });
    toast.success("Delegate edge recorded (private amount stub → NOTR/Buzz)");
  }

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
            <CardDescription className="font-mono">
              @{item.handle}
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
            Agent pay card · {item.kind}
          </div>
          <p className="mt-2 break-all font-mono text-xs text-fg">
            {item.payUrl}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="font-mono">
              {item.defaultAmount} {item.asset}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {item.network}
            </Badge>
            {item.harnesses.map((h) => (
              <Badge key={h} variant="default" className="gap-1">
                <Bot className="size-3" />
                {h}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-augment/40 text-augment hover:bg-augment/10"
            disabled={linked}
            onClick={() => void onLink()}
          >
            <Link2 className="size-3.5" />
            {linked ? "Linked" : "Link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-augment/40 text-augment hover:bg-augment/10"
            onClick={() => void onDelegate()}
          >
            Delegate
          </Button>
        </div>

        {recent.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-wider text-subtle">
              Recent public proofs
            </div>
            <ul className="space-y-1.5">
              {recent.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border border-border bg-surface px-2.5 py-2"
                >
                  <p className="font-mono text-[10px] leading-relaxed text-muted">
                    {formatProofStrip(p)}
                  </p>
                  <button
                    type="button"
                    className="mt-1 text-[10px] text-augment hover:underline"
                    onClick={() => {
                      void copyText(formatProofShareLine(p)).then(() =>
                        toast.success("Proof share line copied"),
                      );
                    }}
                  >
                    Copy share line
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                `Page @${item.handle} via X Wealth x402 · ${item.payUrl} · ${item.defaultAmount} USDC Solana`,
              ).then(() => toast.success("Agent page payload copied"));
            }}
          >
            Copy agent page payload
          </Button>
        </div>

        <p className="text-[11px] leading-relaxed text-subtle">
          Edge public · amount private. Wire your card in the console; REAL x402
          writes a truncated Space Cowboy proof on the map.
        </p>
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
  if (item.avatarUrl) {
    return (
      <img
        src={item.avatarUrl}
        alt={`@${item.handle}`}
        width={large ? 48 : 40}
        height={large ? 48 : 40}
        className={`shrink-0 rounded-full border border-border object-cover ${size}`}
        decoding="async"
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
