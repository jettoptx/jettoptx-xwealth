/**
 * Blockworks / Messari — native crypto + DeFi intelligence for Web4 SEO.
 *
 * Product home: https://blockworks.com/products/api-mcp
 * API:          https://api.messari.io  (x-messari-api-key)
 * MCP:          https://mcp.messari.io/mcp
 * Docs:         https://docs.messari.io/
 *
 * Public asset search works without a key for basic discovery;
 * optional MESSARI_API_KEY unlocks richer market metrics.
 * CoinGecko used as free market/logo fallback.
 */

export const BLOCKWORKS_PRODUCT = "https://blockworks.com/products/api-mcp";
export const BLOCKWORKS_MCP_URL = "https://mcp.messari.io/mcp";
export const MESSARI_API = "https://api.messari.io";
export const MESSARI_KEYS = "https://messari.io/account/api";
export const COINGECKO_API = "https://api.coingecko.com/api/v3";

export type CryptoAssetHit = {
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
  source: "blockworks-messari" | "coingecko";
  /** DeFi-ish classification for UI badges */
  isDefi: boolean;
};

export type CryptoSearchResult = {
  query: string;
  assets: CryptoAssetHit[];
  source: "blockworks-messari" | "coingecko" | "merged";
  mcp: string;
  product: string;
  configured: boolean;
};

function messariKey(): string | null {
  const k =
    (process.env.MESSARI_API_KEY as string | undefined)?.trim() ||
    (process.env.BLOCKWORKS_API_KEY as string | undefined)?.trim() ||
    (process.env.X_MESSARI_API_KEY as string | undefined)?.trim() ||
    "";
  return k.length > 8 ? k : null;
}

export function blockworksConfigured(): boolean {
  // Public search works without key; key upgrades coverage
  return true;
}

export function blockworksKeyConfigured(): boolean {
  return Boolean(messariKey());
}

function isDefiAsset(a: {
  sector?: string | null;
  category?: string | null;
  sectors?: string[];
  tags?: string[];
  name?: string;
}): boolean {
  const blob = [
    a.sector,
    a.category,
    ...(a.sectors ?? []),
    ...(a.tags ?? []),
    a.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /defi|dex|lending|amm|yield|liquidity|swap|perp|derivative|money.?market|stablecoin|staking|restaking|bridge|oracle|rwa/i.test(
    blob,
  );
}

type MessariAsset = {
  id?: string;
  name?: string;
  slug?: string;
  symbol?: string;
  rank?: number;
  category?: string;
  sector?: string;
  sectorV2?: string[];
  tags?: string[];
  marketData?: {
    priceUsd?: number;
    volumeLast24Hours?: number;
    marketcap?: number;
  };
  returnOnInvestment?: {
    priceChange24h?: number;
  };
  // some payloads nest differently
  metrics?: {
    market_data?: {
      price_usd?: number;
      volume_last_24_hours?: number;
      percent_change_usd_last_24_hours?: number;
    };
    marketcap?: { current_marketcap_usd?: number };
  };
};

function mapMessari(a: MessariAsset): CryptoAssetHit {
  const slug = a.slug || a.symbol?.toLowerCase() || a.id || "unknown";
  const price =
    a.marketData?.priceUsd ?? a.metrics?.market_data?.price_usd ?? null;
  const change =
    a.returnOnInvestment?.priceChange24h ??
    a.metrics?.market_data?.percent_change_usd_last_24_hours ??
    null;
  const mcap =
    a.marketData?.marketcap ??
    a.metrics?.marketcap?.current_marketcap_usd ??
    null;
  const vol =
    a.marketData?.volumeLast24Hours ??
    a.metrics?.market_data?.volume_last_24_hours ??
    null;
  const sectors = a.sectorV2 ?? (a.sector ? [a.sector] : []);
  const hit: CryptoAssetHit = {
    id: a.id || slug,
    name: a.name || a.symbol || slug,
    symbol: (a.symbol || "").toUpperCase(),
    slug,
    rank: typeof a.rank === "number" ? a.rank : null,
    priceUsd: typeof price === "number" ? price : null,
    change24h: typeof change === "number" ? change : null,
    marketCapUsd: typeof mcap === "number" ? mcap : null,
    volume24h: typeof vol === "number" ? vol : null,
    category: a.category ?? null,
    sector: a.sector ?? sectors[0] ?? null,
    sectors,
    tags: a.tags ?? [],
    logoUrl: null,
    profileUrl: `https://messari.io/asset/${slug}`,
    source: "blockworks-messari",
    isDefi: false,
  };
  hit.isDefi = isDefiAsset(hit);
  return hit;
}

/**
 * Search tokens / protocols via Blockworks (Messari metrics v2).
 * Works without API key for basic discovery; key optional.
 */
export async function searchMessariAssets(opts: {
  query: string;
  limit?: number;
  /** Prefer DeFi-leaning results when true */
  defiOnly?: boolean;
}): Promise<CryptoAssetHit[]> {
  const q = opts.query.trim();
  if (!q) return [];
  const limit = Math.min(25, Math.max(1, opts.limit ?? 12));

  const url = new URL(`${MESSARI_API}/metrics/v2/assets`);
  url.searchParams.set("search", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", "1");

  const headers: HeadersInit = { Accept: "application/json" };
  const key = messariKey();
  if (key) {
    headers["x-messari-api-key"] = key;
    headers["X-Messari-API-Key"] = key;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Messari search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: MessariAsset[]; error?: unknown };
  let assets = (json.data ?? []).map(mapMessari);

  if (opts.defiOnly) {
    const filtered = assets.filter((a) => a.isDefi);
    // If filter emptied good results, keep originals but mark intent
    if (filtered.length > 0) assets = filtered;
  }

  return assets;
}

/** CoinGecko free search — logos + market ranks when Messari is thin */
export async function searchCoinGecko(opts: {
  query: string;
  limit?: number;
}): Promise<CryptoAssetHit[]> {
  const q = opts.query.trim();
  if (!q) return [];
  const limit = Math.min(20, Math.max(1, opts.limit ?? 12));

  const url = new URL(`${COINGECKO_API}/search`);
  url.searchParams.set("query", q);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoinGecko search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    coins?: Array<{
      id: string;
      name: string;
      symbol: string;
      market_cap_rank?: number | null;
      thumb?: string;
      large?: string;
    }>;
  };

  return (json.coins ?? []).slice(0, limit).map((c) => {
    const hit: CryptoAssetHit = {
      id: c.id,
      name: c.name,
      symbol: (c.symbol || "").toUpperCase(),
      slug: c.id,
      rank: c.market_cap_rank ?? null,
      priceUsd: null,
      change24h: null,
      marketCapUsd: null,
      volume24h: null,
      category: null,
      sector: null,
      sectors: [],
      tags: [],
      logoUrl: c.large || c.thumb || null,
      profileUrl: `https://www.coingecko.com/en/coins/${c.id}`,
      source: "coingecko",
      isDefi: /defi|uni|aave|curve|comp|maker|lido|pendle|morpho|jup|raydium|orca|marinade/i.test(
        `${c.name} ${c.id}`,
      ),
    };
    return hit;
  });
}

/**
 * Unified crypto / DeFi discover for Web4 SEO.
 * Primary: Blockworks/Messari · Fallback/merge: CoinGecko logos
 */
export async function searchCryptoDefi(opts: {
  query: string;
  mode?: "crypto" | "defi" | "all";
  limit?: number;
}): Promise<CryptoSearchResult> {
  const mode = opts.mode ?? "crypto";
  const limit = opts.limit ?? 12;
  const defiOnly = mode === "defi";

  let messari: CryptoAssetHit[] = [];
  let gecko: CryptoAssetHit[] = [];
  let messariErr: string | null = null;

  try {
    messari = await searchMessariAssets({
      query: opts.query,
      limit,
      defiOnly,
    });
  } catch (e) {
    messariErr = e instanceof Error ? e.message : String(e);
  }

  try {
    gecko = await searchCoinGecko({ query: opts.query, limit });
  } catch {
    /* optional */
  }

  // Merge: Messari primary, overlay CoinGecko logos by symbol
  const bySymbol = new Map<string, CryptoAssetHit>();
  for (const g of gecko) {
    bySymbol.set(g.symbol.toUpperCase(), g);
  }
  const merged: CryptoAssetHit[] = [];
  const seen = new Set<string>();

  for (const m of messari) {
    const g = bySymbol.get(m.symbol.toUpperCase());
    const row = g?.logoUrl ? { ...m, logoUrl: g.logoUrl } : m;
    merged.push(row);
    seen.add(m.symbol.toUpperCase());
  }
  // Fill with gecko if messari empty/thin
  if (merged.length < 4) {
    for (const g of gecko) {
      if (seen.has(g.symbol.toUpperCase())) continue;
      if (defiOnly && !g.isDefi) continue;
      merged.push(g);
      seen.add(g.symbol.toUpperCase());
      if (merged.length >= limit) break;
    }
  }

  if (merged.length === 0 && messariErr) {
    throw new Error(messariErr);
  }

  return {
    query: opts.query,
    assets: merged.slice(0, limit),
    source:
      messari.length && gecko.length
        ? "merged"
        : messari.length
          ? "blockworks-messari"
          : "coingecko",
    mcp: BLOCKWORKS_MCP_URL,
    product: BLOCKWORKS_PRODUCT,
    configured: blockworksKeyConfigured(),
  };
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(3)}`;
}
