# Security audit — X Wealth (2026-08)

**Scope:** `apps/web` + root `src` / `scripts` / API routes  
**Date:** 2026-08-03  
**Rules:** Forge Rule 06 — no secrets in client; no private JOE IP dump; no real `.env` commits.

---

## Findings + fixes

| Severity | Finding | File | Fix |
|----------|---------|------|-----|
| **Critical** | LIVE settle enabled by client `X-X402-MODE: live` / `body.mode=live` / `VITE_X402_LIVE_ENABLED` without server env | `routes/api/x402/pay.ts` | **Fixed:** `liveEnabled()` only accepts server `X402_LIVE_ENABLED=true`. Header/body ignored as enablers. |
| **Critical** | `/api/mojo/broadcast` accepted arbitrary signed txs with no LIVE gate | `routes/api/mojo/broadcast.ts` | **Fixed:** returns 403 unless `X402_LIVE_ENABLED=true`. |
| **High** | Open Solana RPC proxy forwarded any method (incl. `sendTransaction`) with CORS `*` | `lib/helius-rpc.ts` `proxySolanaJsonRpc` | **Fixed:** read-only method allowlist (`getTokenAccountsByOwner`, balances, etc.). Writes rejected. |
| **High** | `VITE_TINYFISH_API_KEY` fallback could ship TinyFish key into client naming path | `lib/tinyfish.ts` | **Fixed:** server-only `TINYFISH_API_KEY`. |
| **High** | No payTo allowlist on `/api/x402/pay` (arbitrary X Money URL / pubkey) | `routes/api/x402/pay.ts`, `lib/x402.ts` | **Documented residual.** Prefer catalog / X Money URL pattern allowlist next; Mojo Solana dest should match treasury/faucet set. Not auto-enabled LIVE. |
| **High** | `PAYMENT-SIGNATURE` is base64 JSON, not crypto-verified wallet sig | `lib/x402.ts` `settlePayment` | **Documented residual.** Dry-run safe; LIVE must verify before broadcast. |
| **Medium** | JTX gate is client/UI (+ CLI) — money APIs do not re-check ≥1 JTX | `lib/jtxGate.ts`, API routes | **Fixed (Hedgehog P0):** 2-tier `requireJtxGate` — **balance+rate-limit** for Discover APIs; **balance+ed25519 ownership** (`X-JTX-Proof`) for x402 settle + mojo. CORS allowlist (no `*` on gated denies). Buy URL `https://astroknots.space/buy`. Bypass: `JTX_GATE_DISABLED=true`. |
| **Medium** | CORS `*` on `/api/x402/pay` and `/api/solana-rpc` | pay.ts, solana-rpc.ts | **Partial:** x402 + JTX deny responses use origin allowlist (`jtx-cors.ts`). `/api/solana-rpc` still permissive for browser JTX check — tighten with LIVE. |
| **Medium** | `VITE_SOLANA_RPC_URL` can expose keyed RPC if mis-set | `.env.example`, `jtxGate.ts` | Docs warn: never put keys in `VITE_*`. Prefer `/api/solana-rpc`. |
| **Low** | Hardcoded Privy app id fallback | `lib/auth/privy.ts` | Public client id; product gate remains JTX wallet, not Privy. |
| **Info** | No EFvg wallet references in code | — | Catalog payTo = `5ct4…Cbyc` / `jtxfaucet.sol`; fee docs = Squads `9Wss…6YD7`. |
| **Info** | No hardcoded Helius/QuickNode tokens; `.env` gitignored; examples placeholders | `.env.example` | Keep placeholders only. |
| **Info** | No `postinstall` / install hooks in package.json | root + `apps/web` | Clean. |
| **Info** | Avatar proxy host-allowlisted; probe-money builds fixed x.com URLs | `api/avatar.ts`, `lib/x-api.ts` | No open SSRF on money routes. |

---

## Probe notes (redacted)

- `GET https://xwealth.space/api/x402/pay` → **402** with USDC mint `EPjF…Dt1v`, `payTo` X Money URL (dry-run advertise).
- AARON / jtx catalogs → `payTo` faucet pubkey (not EFvg), USDC mint, service prices.
- Local `npm test` → **15/15 pass**.
- `npm run dry-run` → correctly blocks when wallet lacks ≥1 JTX.

---

## Residual (do not “fix” by enabling LIVE)

1. ~~Server-side JTX check on settle/broadcast.~~ (`jtx-require.server.ts`)  
2. ~~Ownership proof on settle/mojo + rate-limit on balance-only Discover.~~ (Hedgehog 2-tier)  
3. payTo allowlist (X Money host + Solana pubkey set).  
4. Cryptographic verification of `PAYMENT-SIGNATURE` (still envelope/base64 JSON for dry-run; LIVE must verify before broadcast).  
5. CORS on `/api/solana-rpc` when LIVE is productized.  
6. Session token after first ownership proof (reduce Phantom prompts).

**Never** enable mainnet spend as a remediation. Operator LIVE = explicit `X402_LIVE_ENABLED=true` on the server only.
