import { createFileRoute } from "@tanstack/react-router";
import {
  isAllowedAvatarUrl,
  upgradeXAvatarUrl,
} from "@/lib/auth/profile-image";

/**
 * Same-origin avatar stream. Proxies X/Google CDN images so the browser
 * doesn't drop them to a monogram (hotlink / referrer / CSP edge cases).
 */
export const Route = createFileRoute("/api/avatar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("u") ?? "";
        let remote: string;
        try {
          remote = decodeURIComponent(raw);
        } catch {
          return new Response("bad url", { status: 400 });
        }
        if (!isAllowedAvatarUrl(remote)) {
          return new Response("host not allowed", { status: 400 });
        }
        const target = upgradeXAvatarUrl(remote);
        try {
          const upstream = await fetch(target, {
            headers: {
              Accept: "image/avif,image/webp,image/*;q=0.8,*/*;q=0.5",
              // X CDN is happier without a site referrer
              "User-Agent": "XWealthAvatarProxy/1.0",
            },
            redirect: "follow",
          });
          if (!upstream.ok || !upstream.body) {
            return new Response("upstream failed", { status: 502 });
          }
          const contentType =
            upstream.headers.get("content-type") ?? "image/jpeg";
          if (!contentType.startsWith("image/")) {
            return new Response("not an image", { status: 502 });
          }
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("fetch failed", { status: 502 });
        }
      },
    },
  },
});
