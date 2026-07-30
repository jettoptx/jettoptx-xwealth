/**
 * TinyFish Web Agent helpers for Augments marketplace enrichment.
 * @see https://docs.tinyfish.ai/mcp-integration
 * @see https://docs.tinyfish.ai/fetch-api/reference
 * @see https://docs.tinyfish.ai/agent-api/reference
 */

export const TINYFISH_MCP_URL = "https://agent.tinyfish.ai/mcp";
export const TINYFISH_FETCH_URL = "https://api.fetch.tinyfish.ai";
export const TINYFISH_SEARCH_URL = "https://api.search.tinyfish.ai";
export const TINYFISH_AGENT_RUN_URL =
  "https://agent.tinyfish.ai/v1/automation/run";
export const TINYFISH_DASHBOARD = "https://agent.tinyfish.ai/api-keys";

export type TinyFishFetchResult = {
  url: string;
  final_url?: string;
  title?: string | null;
  description?: string | null;
  text?: string | object;
  image_links?: string[];
  links?: string[];
  latency_ms?: number | null;
};

export type TinyFishFetchResponse = {
  results: TinyFishFetchResult[];
  errors: Array<{ url: string; error: string; status?: number }>;
};

export type AugmentEnrichment = {
  handle: string;
  profileUrl: string;
  payUrl: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  /** Best-effort from pay page content */
  hasXMoney: boolean | null;
  evidence: string[];
  source: "tinyfish-fetch" | "tinyfish-agent";
  rawTitles: string[];
};

function getApiKey(): string | null {
  const k =
    (process.env.TINYFISH_API_KEY as string | undefined)?.trim() ||
    (process.env.VITE_TINYFISH_API_KEY as string | undefined)?.trim() ||
    "";
  return k.length > 8 ? k : null;
}

export function tinyfishConfigured(): boolean {
  return Boolean(getApiKey());
}

function extractAvatar(imageLinks: string[] | undefined): string | null {
  if (!imageLinks?.length) return null;
  const hit = imageLinks.find(
    (u) =>
      /pbs\.twimg\.com\/profile_images/i.test(u) ||
      /twimg\.com\/profile/i.test(u),
  );
  return hit ?? imageLinks[0] ?? null;
}

function inferMoney(
  payText: string,
  payTitle: string | null | undefined,
  payErrors: string[],
): { hasXMoney: boolean | null; evidence: string[] } {
  const evidence: string[] = [];
  const blob = `${payTitle ?? ""}\n${payText}`.slice(0, 100_000);

  if (payErrors.some((e) => e === "page_not_found")) {
    evidence.push("pay URL returned page_not_found");
    return { hasXMoney: false, evidence };
  }

  if (/money isn.?t available|not eligible|can.?t send money|unavailable/i.test(blob)) {
    evidence.push("pay page copy suggests Money unavailable");
    return { hasXMoney: false, evidence };
  }

  if (
    /amount|send money|transfer|pay @|x money|i\/money\/pay/i.test(blob) &&
    blob.length > 40
  ) {
    evidence.push("pay page content looks like an active Money surface");
    return { hasXMoney: true, evidence };
  }

  if (blob.length < 20) {
    evidence.push("pay page nearly empty / login-walled — unknown");
    return { hasXMoney: null, evidence };
  }

  evidence.push("ambiguous pay page — unknown");
  return { hasXMoney: null, evidence };
}

/**
 * Free-tier Fetch API: pull X profile + Money pay page for a handle.
 */
export async function enrichHandleWithTinyFish(
  handle: string,
): Promise<AugmentEnrichment> {
  const h = handle.replace(/^@/, "").trim();
  if (!h) throw new Error("missing_handle");

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "TINYFISH_API_KEY not configured. Add it in Vercel env or .env.local — see https://agent.tinyfish.ai/api-keys",
    );
  }

  const profileUrl = `https://x.com/${encodeURIComponent(h)}`;
  const payUrl = `https://x.com/i/money/pay/${encodeURIComponent(h)}`;

  const res = await fetch(TINYFISH_FETCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify({
      urls: [profileUrl, payUrl],
      format: "markdown",
      links: true,
      image_links: true,
      ttl: 300,
      per_url_timeout_ms: 45_000,
      purpose: `X Wealth Augments: enrich @${h} profile logo + X Money eligibility`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `TinyFish fetch failed (${res.status}): ${body.slice(0, 240)}`,
    );
  }

  const json = (await res.json()) as TinyFishFetchResponse;
  const byUrl = new Map(
    (json.results ?? []).map((r) => [r.url.replace(/\/$/, ""), r]),
  );
  // TinyFish may return final_url — match loosely
  const profile =
    byUrl.get(profileUrl) ??
    json.results?.find((r) => r.url.includes(`/${h}`) && !r.url.includes("money")) ??
    null;
  const pay =
    byUrl.get(payUrl) ??
    json.results?.find((r) => r.url.includes("money/pay")) ??
    null;

  const payErrs = (json.errors ?? [])
    .filter((e) => e.url.includes("money"))
    .map((e) => e.error);

  const profileText =
    typeof profile?.text === "string" ? profile.text : JSON.stringify(profile?.text ?? "");
  const payText =
    typeof pay?.text === "string" ? pay.text : JSON.stringify(pay?.text ?? "");

  const money = inferMoney(payText, pay?.title, payErrs);

  // Bio: prefer meta description, else first non-empty markdown lines
  let bio = profile?.description?.trim() || null;
  if (!bio && profileText) {
    const lines = profileText
      .split("\n")
      .map((l) => l.replace(/^#+\s*/, "").trim())
      .filter((l) => l.length > 12 && !/^https?:/i.test(l));
    bio = lines[0]?.slice(0, 280) ?? null;
  }

  return {
    handle: h,
    profileUrl,
    payUrl,
    displayName: profile?.title?.replace(/\s*[(@].*$/, "").trim() || null,
    bio,
    avatarUrl: extractAvatar(profile?.image_links),
    hasXMoney: money.hasXMoney,
    evidence: money.evidence,
    source: "tinyfish-fetch",
    rawTitles: [profile?.title, pay?.title].filter(Boolean) as string[],
  };
}

/**
 * Paid agent run — deeper Money probe when fetch is login-walled.
 * Uses sync /v1/automation/run (max ~2 min).
 */
export async function agentProbeXMoney(handle: string): Promise<{
  hasXMoney: boolean | null;
  result: unknown;
  runId: string | null;
}> {
  const h = handle.replace(/^@/, "").trim();
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("TINYFISH_API_KEY not configured");

  const res = await fetch(TINYFISH_AGENT_RUN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      url: `https://x.com/i/money/pay/${encodeURIComponent(h)}`,
      goal: `Determine if @${h} has X Money enabled for receiving payments. Return JSON: {"hasXMoney": true|false|null, "reason": "short"}. If login wall, set hasXMoney null.`,
      browser_profile: "stealth",
      output_schema: {
        type: "object",
        properties: {
          hasXMoney: { type: ["boolean", "null"] },
          reason: { type: "string" },
        },
        required: ["hasXMoney", "reason"],
      },
      agent_config: {
        max_duration_seconds: 90,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TinyFish agent run failed (${res.status}): ${body.slice(0, 240)}`);
  }

  const json = (await res.json()) as {
    run_id?: string;
    status?: string;
    result?: { hasXMoney?: boolean | null; reason?: string };
    error?: unknown;
  };

  return {
    hasXMoney:
      typeof json.result?.hasXMoney === "boolean" ? json.result.hasXMoney : null,
    result: json.result ?? json.error ?? null,
    runId: json.run_id ?? null,
  };
}

export type TinyFishSearchHit = {
  position: number;
  site_name?: string;
  title: string;
  snippet?: string;
  url: string;
  date?: string;
  publisher?: string;
};

export type TinyFishSearchResponse = {
  query: string;
  results: TinyFishSearchHit[];
  total_results?: number;
  page?: number;
};

export type Web4DiscoverQuery = {
  query: string;
  location?: string;
  language?: string;
  domainType?: "web" | "news" | "research_paper";
  /** Agent-SEO purpose signal for ranking quality */
  purpose?: string;
  includeDomains?: string;
  excludeDomains?: string;
  recencyMinutes?: number;
  page?: number;
};

/**
 * TinyFish Search — free-tier web discovery for Web4 agent SEO.
 * @see https://docs.tinyfish.ai/search-api/reference
 */
export async function searchWeb4(opts: Web4DiscoverQuery): Promise<TinyFishSearchResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "TINYFISH_API_KEY not configured. Add it in Vercel env or .env.local.",
    );
  }

  const q = opts.query.trim();
  if (!q) throw new Error("missing_query");

  const url = new URL(TINYFISH_SEARCH_URL);
  url.searchParams.set("query", q);
  url.searchParams.set("location", opts.location ?? "US");
  url.searchParams.set("language", opts.language ?? "en");
  if (opts.domainType) url.searchParams.set("domain_type", opts.domainType);
  if (opts.purpose?.trim()) url.searchParams.set("purpose", opts.purpose.trim());
  if (opts.includeDomains)
    url.searchParams.set("include_domains", opts.includeDomains);
  if (opts.excludeDomains)
    url.searchParams.set("exclude_domains", opts.excludeDomains);
  if (typeof opts.recencyMinutes === "number" && opts.recencyMinutes > 0) {
    url.searchParams.set("recency_minutes", String(opts.recencyMinutes));
  }
  if (typeof opts.page === "number") {
    url.searchParams.set("page", String(Math.min(10, Math.max(0, opts.page))));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `TinyFish search failed (${res.status}): ${body.slice(0, 240)}`,
    );
  }

  const json = (await res.json()) as TinyFishSearchResponse;
  return {
    query: json.query ?? q,
    results: Array.isArray(json.results) ? json.results : [],
    total_results: json.total_results,
    page: json.page ?? 0,
  };
}

/** Pull @handles from search titles/snippets/urls for agent graph seeding */
export function extractHandlesFromSearch(
  results: TinyFishSearchHit[],
): string[] {
  const found = new Set<string>();
  const re = /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{1,15})\b/g;
  const xUrl = /(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:\/|$|\?)/i;
  for (const r of results) {
    const blob = `${r.title}\n${r.snippet ?? ""}\n${r.url}`;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(blob)) !== null) {
      found.add(m[1]);
    }
    const um = r.url.match(xUrl);
    if (um?.[1] && !["i", "intent", "search", "home", "explore"].includes(um[1].toLowerCase())) {
      found.add(um[1]);
    }
  }
  return Array.from(found).slice(0, 24);
}
