# Handoff — next agent (Cloudflare + repo)

Read this before changing DNS or deploy roots. MoA v1 is already live.

## Already done

- **https://xwealth.space** live on Vercel (`xwealth-ui` / team `space-cowboys`)
- Privy X login + OPTX orange + x402 dry-run / REAL (Privy sign → X Money window)
- **Map of Augments v1**: List|Map, seed graph around `@jettoptx`, truncated proofs (`amountPublic: null`), NOTR stub
- DNS today: **Vercel nameservers** (`ns1/ns2.vercel-dns.com`) — **not** Cloudflare
- Open PRs (merge if still open):
  - https://github.com/jettoptx/xwealth/pull/1
  - https://github.com/jettoptx/jettoptx-xwealth/pull/2 (`apps/web` fold)

Also see: `docs/MOA-GRAPH.md`

## 1. Cloudflare (do first)

Previous agent had **no Cloudflare DNS zone tools**. Confirm intent:

### A — Stay on Vercel DNS (current)

No CF zone changes. Document and skip.

### B — Move / proxy via Cloudflare

If Cloudflare is (or should be) authoritative for `xwealth.space`:

| Type | Name | Content | Notes |
|------|------|---------|--------|
| A / ALIAS | `@` | Vercel apex / CNAME flattening → `cname.vercel-dns.com` | Grey-cloud while verifying |
| CNAME | `www` | `cname.vercel-dns.com` (or Vercel redirect) | Same |
| TXT | `_vercel` | token from Vercel → Project → Domains | DNS only / grey cloud |

Then in Vercel Domains: re-verify, keep `www` → apex, confirm no `DEPLOYMENT_NOT_FOUND`.

Watch: Workers/Pages collisions, SSL full/strict, orange-cloud vs cert issuance.

## 2. Repo / deploy hygiene

1. Merge both PRs (or treat **canonical** = `jettoptx/jettoptx-xwealth` → `apps/web`).
2. If fold is complete, point Vercel root at `apps/web`; stop dual-source drift with `jettoptx/xwealth`.
3. Confirm Git production branch = `main` and auto-deploys (project was also CLI-deployed).
4. Env already set: `VITE_PRIVY_APP_ID`, `VITE_PRIVY_ENABLED`, `VITE_APP_URL`. **Never** put Helius keys in the client.

## 3. Still open (product / infra — not blocking CF)

| Item | Status |
|------|--------|
| `publishDelegatePrivate` → Buzz/NOTR | Stub only — `src/lib/notr-relay.ts` |
| Cross-device / multi-user proofs | Local Zustand only — needs server/DB or relay |
| Helius (primary) + Light Protocol | Documented direction, not wired |
| QuickNode | Failover only — not wired |
| x402 facilitator / live on-chain settle | Intent + X Money window only |
| Token-2022 confidential / Zama FHE | Later — do not block |
| Force-graph / SpacetimeDB | Out of scope for v1 |

## 4. Suggested order

1. Inventory CF zone for `xwealth.space` (NS, records, proxy).
2. Align DNS with Vercel **or** document “Vercel NS only”.
3. Merge PRs; smoke https://xwealth.space/augments?view=map
4. Optional: CF Worker for public proof fan-out / NOTR edge — **amounts stay private**
5. Helius/Light in a separate Solana pass — do not block MoA UI

## Context URLs

- https://xwealth.space
- https://xwealth.space/augments
- https://xwealth.space/console
- https://www.jettoptx.chat/send?c=2
- https://www.jettoptx.dev/docs
- Vercel team: `space-cowboys` · project: `xwealth-ui` (`prj_3ngkx3LhGAQw0QWib3HCPhesTPIK`)
