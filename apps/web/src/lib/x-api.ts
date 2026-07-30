/**
 * X API v2 helpers for Augments marketplace graph.
 * Followers / following require a user OAuth 2.0 access token (follows.read + users.read).
 */

export type XApiUser = {
  id: string;
  username: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
  };
};

export type SocialGraphPerson = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  followers: number;
  following: number;
  relation: "following" | "follower";
  /** Best-effort X Money surface detection */
  hasXMoney: boolean | null;
  payUrl: string;
};

const X_API = "https://api.x.com/2";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export async function xFetchMe(accessToken: string): Promise<XApiUser | null> {
  const url = new URL(`${X_API}/users/me`);
  url.searchParams.set(
    "user.fields",
    "profile_image_url,public_metrics,description,name,username",
  );
  const res = await fetch(url, { headers: authHeaders(accessToken) });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: XApiUser };
  return json.data ?? null;
}

async function xFetchUserList(
  accessToken: string,
  userId: string,
  list: "followers" | "following",
  maxResults = 100,
): Promise<XApiUser[]> {
  const path =
    list === "followers"
      ? `${X_API}/users/${userId}/followers`
      : `${X_API}/users/${userId}/following`;
  const url = new URL(path);
  url.searchParams.set(
    "max_results",
    String(Math.min(100, Math.max(1, maxResults))),
  );
  url.searchParams.set(
    "user.fields",
    "profile_image_url,public_metrics,description,name,username",
  );

  const out: XApiUser[] = [];
  let next: string | undefined;
  let pages = 0;
  do {
    if (next) url.searchParams.set("pagination_token", next);
    const res = await fetch(url, { headers: authHeaders(accessToken) });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `X API ${list} failed (${res.status}): ${body.slice(0, 200)}`,
      );
    }
    const json = (await res.json()) as {
      data?: XApiUser[];
      meta?: { next_token?: string };
    };
    if (json.data?.length) out.push(...json.data);
    next = json.meta?.next_token;
    pages += 1;
    // Cap pages so we don't burn rate limit (first ~200 users)
  } while (next && pages < 2 && out.length < maxResults);

  return out;
}

/**
 * Best-effort: does this handle expose an X Money pay surface?
 * Public HTML is login-walled; we treat a fast non-404 / non-hard-error as possible yes,
 * and soft-fail to null (unknown) rather than false negatives.
 */
export async function probeXMoney(
  handle: string,
): Promise<boolean | null> {
  const h = handle.replace(/^@/, "").trim();
  if (!h) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3500);
  try {
    // Syndication / lightweight existence check first
    const syn = await fetch(
      `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${encodeURIComponent(h)}`,
      { signal: controller.signal, headers: { Accept: "application/json" } },
    );
    if (syn.ok) {
      const arr = (await syn.json()) as unknown;
      if (!Array.isArray(arr) || arr.length === 0) return null;
    }
    // Money pay path — many CDNs return 200 shell even when not enrolled
    const money = await fetch(`https://x.com/i/money/pay/${encodeURIComponent(h)}`, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "XWealthMoneyProbe/1.0",
      },
    });
    if (money.status === 404) return false;
    if (money.status >= 200 && money.status < 400) {
      const text = (await money.text()).slice(0, 80_000);
      // Heuristics when page is partially public
      if (/money\/pay|transfer-pay|amount-input|X Money|i\/money/i.test(text)) {
        // "not available" / disabled copy → false
        if (/money isn.?t available|not eligible|can.?t send money/i.test(text)) {
          return false;
        }
        return true;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function toPerson(
  u: XApiUser,
  relation: "following" | "follower",
  hasXMoney: boolean | null,
): SocialGraphPerson {
  const handle = u.username;
  return {
    id: u.id,
    handle,
    displayName: u.name || handle,
    bio: u.description?.trim() || "",
    avatarUrl: u.profile_image_url
      ? u.profile_image_url.replace("_normal", "_400x400")
      : null,
    followers: u.public_metrics?.followers_count ?? 0,
    following: u.public_metrics?.following_count ?? 0,
    relation,
    hasXMoney,
    payUrl: `https://x.com/i/money/pay/${handle}`,
  };
}

export async function fetchSocialGraph(opts: {
  accessToken: string;
  /** Cap per list (default 50) */
  limit?: number;
  /** Probe X Money (slower). Default true for first page only. */
  probeMoney?: boolean;
}): Promise<{
  me: SocialGraphPerson | null;
  following: SocialGraphPerson[];
  followers: SocialGraphPerson[];
  source: "x-api";
}> {
  const limit = opts.limit ?? 50;
  const meUser = await xFetchMe(opts.accessToken);
  if (!meUser?.id) {
    throw new Error(
      "Could not load X profile. Re-sign in with X and grant users.read / follows.read.",
    );
  }

  const [followingUsers, followerUsers] = await Promise.all([
    xFetchUserList(opts.accessToken, meUser.id, "following", limit),
    xFetchUserList(opts.accessToken, meUser.id, "followers", limit),
  ]);

  const probe = opts.probeMoney !== false;
  async function mapList(
    users: XApiUser[],
    relation: "following" | "follower",
  ): Promise<SocialGraphPerson[]> {
    // Probe money in small parallel batches
    const out: SocialGraphPerson[] = [];
    const batchSize = probe ? 6 : users.length || 1;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const money = probe
        ? await Promise.all(batch.map((u) => probeXMoney(u.username)))
        : batch.map(() => null as boolean | null);
      batch.forEach((u, j) => out.push(toPerson(u, relation, money[j] ?? null)));
    }
    return out;
  }

  const [following, followers] = await Promise.all([
    mapList(followingUsers, "following"),
    mapList(followerUsers, "follower"),
  ]);

  const meMoney = probe ? await probeXMoney(meUser.username) : null;

  return {
    me: toPerson(meUser, "following", meMoney),
    following,
    followers,
    source: "x-api",
  };
}
