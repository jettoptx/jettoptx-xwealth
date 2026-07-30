/**
 * Normalize OAuth / broker profile payloads into a usable avatar URL.
 * Handles X (`profile_image_url`), Google (`picture`), and common aliases.
 */

const IMAGE_KEYS = [
  "picture",
  "image",
  "profile_image_url",
  "profile_image_url_https",
  "avatar_url",
  "avatar",
  "photo",
  "photoURL",
] as const;

/** Prefer higher-res X CDN variants (`_normal` → `_400x400`). */
export function upgradeXAvatarUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("twimg.com") && !u.hostname.endsWith("twitter.com")) {
      return url;
    }
    // pbs.twimg.com/profile_images/.../foo_normal.jpg
    u.pathname = u.pathname
      .replace(/_normal(\.\w+)$/i, "_400x400$1")
      .replace(/_bigger(\.\w+)$/i, "_400x400$1")
      .replace(/_mini(\.\w+)$/i, "_400x400$1");
    return u.toString();
  } catch {
    return url;
  }
}

function firstString(obj: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().startsWith("http")) return v.trim();
  }
  return null;
}

/** Pull avatar URL from a raw userinfo / JWT-shaped profile object. */
export function extractProfileImageUrl(
  profile: Record<string, unknown> | null | undefined,
): string | null {
  if (!profile) return null;
  const direct = firstString(profile, IMAGE_KEYS);
  if (direct) return upgradeXAvatarUrl(direct);

  // Nested shapes some brokers use
  const nested =
    (profile.data as Record<string, unknown> | undefined) ??
    (profile.user as Record<string, unknown> | undefined) ??
    (profile.profile as Record<string, unknown> | undefined);
  if (nested && typeof nested === "object") {
    const n = firstString(nested as Record<string, unknown>, IMAGE_KEYS);
    if (n) return upgradeXAvatarUrl(n);
  }
  return null;
}

/** Hosts we will proxy (same-origin stream for the browser). */
const AVATAR_HOST_ALLOW = [
  "pbs.twimg.com",
  "abs.twimg.com",
  "ton.twimg.com",
  "twimg.com",
  "twitter.com",
  "x.com",
  "lh3.googleusercontent.com",
  "googleusercontent.com",
  "avatars.githubusercontent.com",
  "cdn.discordapp.com",
  "graph.facebook.com",
  "platform-lookaside.fbsbx.com",
];

export function isAllowedAvatarUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return AVATAR_HOST_ALLOW.some(
      (h) => host === h || host.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

/** Same-origin URL that streams the remote avatar (avoids hotlink/CSP issues). */
export function avatarProxyUrl(remoteUrl: string | null | undefined): string | null {
  if (!remoteUrl || !isAllowedAvatarUrl(remoteUrl)) return null;
  return `/api/avatar?u=${encodeURIComponent(upgradeXAvatarUrl(remoteUrl))}`;
}
