# JOE Shield + Scan — Web4 agentic x402 growth endpoints

**Date:** 2026-07-30  
**Surfaces:** `xwealth.space/augments`, dry-run x402, AARON catalog, AgenC, Agentic Market  
**Verdict:** Canonical host = **xwealth.space**. **wealth.astroknots.space** may come down after 301 cutover.

---

## Executive answer

| Claim | Truth |
|-------|--------|
| Public Web4 growth endpoints should live on **xwealth.space** | **Yes** — `/augments` + `/api/x402/pay` (dry-run) are the discover + pay-demo rails |
| **AgenC** is a public Web4 growth endpoint | **No** — local/devnet coordinator (`:8840`); not exposed on xwealth |
| **Agentic Market** is ours to host | **No** — external directory (`api.agentic.market`); use as reference + optional federation |
| **aaron.jettoptics.ai/x402** is live agent commerce | **Yes** — metered USDC services (chat, gaze, task) |
| **wealth.astroknots.space** still required | **No** — dual host of same product lineage; safe to retire with 301 → xwealth.space |

---

## Live probe results (shield scan)

| Endpoint | Status | Classification |
|----------|--------|----------------|
| `GET https://xwealth.space/` | 200 | Public product |
| `GET https://xwealth.space/augments` | 200 | **Web4 Agent SEO** marketplace (discover) |
| `GET/POST https://xwealth.space/api/x402/pay` | **402** (no signature) / 200 dry-run settle | **Public growth** dry-run only — `Access-Control-Allow-Origin: *` intentional for harnesses |
| `GET https://xwealth.space/api/tinyfish/search` | 200 | Discover lane (needs `TINYFISH_API_KEY` server-side) |
| `POST https://xwealth.space/api/blockworks/search` | 200 | Crypto/DeFi lane |
| `POST https://xwealth.space/api/x/social-graph` | 200/401 | User OAuth token required (not open scrape) |
| `GET https://aaron.jettoptics.ai/x402` | 200 | **Live** agent catalog + payTo `jtxfaucet.sol` |
| `GET https://jtx.astroknots.space/x402` | 200 | Public catalog mirror path |
| `GET https://jtx.astroknots.space/agents` | 200 | Agents index |
| `GET https://api.agentic.market/v1/services` | 200 | External agentic market (reference) |
| `GET https://xwealth.space/.well-known/agent-catalog.json` | **404** | **Gap** — machine discovery not published yet |
| `http://127.0.0.1:8840` AgenC | **DOWN** | Not public Web4; optional local swarm |
| `https://wealth.astroknots.space/` | 200 (same product class) | **Deprecate** |

---

## Exposure model (what agents should hit)

```
                    ┌─────────────────────────────────────┐
  Humans / SEO      │  xwealth.space/augments              │  Web4 discover
                    │  TinyFish · Blockworks · X graph     │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
  Harness dry-run   │  xwealth.space/api/x402/pay          │  402 + dry-run only
                    │  CORS * · no on-chain settle          │
                    └──────────────┬──────────────────────┘
                                   │ promote when ready
                    ┌──────────────▼──────────────────────┐
  Live growth       │  aaron.jettoptics.ai/x402            │  USDC metered services
                    │  jtx.astroknots.space/x402            │  catalog listing
                    └─────────────────────────────────────┘

  Local swarm only  │  AGENC_COORDINATOR_URL → :8840       │  NOT public Web4
  External directory│  api.agentic.market                  │  optional index
```

### Public-safe (keep open)

1. **`/augments`** — rankings, listings, discover (no secrets).
2. **`/api/x402/pay`** — protocol advertise + dry-run; agents must learn 402 shape here.
3. **AARON/JTX x402 catalogs** — real metered growth endpoints.
4. **Discover APIs** — TinyFish/Blockworks with **server keys only** (already true).

### Not public Web4

1. **AgenC** (`AGENC_COORDINATOR_URL`) — Solana task coordinator, Hermes Desktop / local.
2. **Live settle** on xwealth `/api/x402/pay` — still dry-run (`settleDryRun`); do not enable mainnet spend without explicit LIVE + payTo control.
3. **X OAuth tokens** — never log; social-graph requires user token.
4. **QuickNode `QN_*` keys** — server env only (not client `VITE_`).

---

## wealth.astroknots.space decommission checklist

1. **DNS / Vercel:** add 301 from `wealth.astroknots.space/*` → `https://xwealth.space/$1`.
2. **Code:** `OPTX_LINKS.wealth` / `moa` already retargeted to xwealth.space (this commit).
3. **Docs:** DEMO.md, AGENTS-DEEPLINK, AUGMENT08-QUANT-STACK → replace wealth host with xwealth.space.
4. **Agents deep links:** `/agents` cards on jtx host → `https://xwealth.space/augments` or `/console`.
5. **After 14d traffic check:** remove Vercel alias / project if unused.
6. **Do not** delete AARON or jtx.astroknots x402 catalogs when retiring wealth host.

---

## Gaps to close for agentic market parity

| Gap | Action |
|-----|--------|
| No `/.well-known/agent-catalog.json` on xwealth | Publish catalog pointing at dry-run pay + AARON services |
| Dual host confusion | 301 wealth → xwealth |
| Live vs dry-run unclear in agent docs | Document `dryRun: true` on xwealth; live = aaron paths |
| AgenC offline locally | Optional; not blocking Web4 public growth |

---

## Shield posture summary

- **Allow:** Public discover + dry-run 402 + AARON metered catalog.  
- **Deny public:** AgenC coordinator, RPC keys, Privy secrets, live settle without LIVE gate.  
- **Retire:** wealth.astroknots.space as primary product host.  
- **Canonical:** **https://xwealth.space/augments** for Web4 Agent SEO growth.

Co-Authored-By: Hedgehog Multimodal <joe@jettoptics.ai>
