import { createFileRoute } from "@tanstack/react-router";
import {
  heliusConfigured,
  heliusHealth,
  proxySolanaJsonRpc,
  resolveSolanaRpcUrl,
  rpcProviderLabel,
} from "@/lib/helius-rpc";

/**
 * Same-origin Solana JSON-RPC proxy → Helius (or SOLANA_RPC_URL).
 * Browser JTX gate + agent harnesses POST here so the API key never ships in VITE_*.
 *
 *   POST /api/solana-rpc  { jsonrpc, id, method, params }
 *   GET  /api/solana-rpc  health probe (slot + provider label)
 */
export const Route = createFileRoute("/api/solana-rpc")({
  server: {
    handlers: {
      GET: async () => {
        const health = await heliusHealth();
        return Response.json(
          {
            ok: health.ok,
            provider: health.rpc,
            configured: heliusConfigured(),
            slot: health.slot ?? null,
            health: health.health ?? null,
            error: health.error ?? null,
            // Never return the full URL with api-key
            endpoint: rpcProviderLabel(resolveSolanaRpcUrl()),
          },
          {
            status: health.ok ? 200 : 503,
            headers: {
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            {
              jsonrpc: "2.0",
              id: null,
              error: { code: -32700, message: "Parse error" },
            },
            { status: 400 },
          );
        }

        const { status, json } = await proxySolanaJsonRpc(body);
        return Response.json(json, {
          status,
          headers: {
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
