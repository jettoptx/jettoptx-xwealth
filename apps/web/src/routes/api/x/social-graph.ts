import { createFileRoute } from "@tanstack/react-router";
import { fetchSocialGraph } from "@/lib/x-api";

/**
 * POST /api/x/social-graph
 * Body: { accessToken: string, limit?: number, probeMoney?: boolean }
 *
 * accessToken = X OAuth 2.0 user access token (from Privy useOAuthTokens for twitter).
 * Requires scopes: users.read, follows.read
 */
export const Route = createFileRoute("/api/x/social-graph")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          accessToken?: string;
          limit?: number;
          probeMoney?: boolean;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const accessToken =
          body.accessToken?.trim() ||
          request.headers.get("x-twitter-access-token")?.trim() ||
          "";

        if (!accessToken || accessToken.length < 20) {
          return Response.json(
            {
              error: "missing_access_token",
              message:
                "Pass Privy X OAuth access token. Sign in with X and ensure follows.read + users.read.",
            },
            { status: 401 },
          );
        }

        try {
          const graph = await fetchSocialGraph({
            accessToken,
            limit: body.limit ?? 50,
            probeMoney: body.probeMoney ?? true,
          });
          return Response.json(graph, {
            headers: {
              "Cache-Control": "private, max-age=60",
            },
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const status = /401|403|Unauthorized|Forbidden/i.test(message)
            ? 403
            : 502;
          return Response.json(
            { error: "x_api_failed", message },
            { status },
          );
        }
      },
    },
  },
});
