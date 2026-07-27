# Agents storefront → Wealth deeplink (patch notes)

**Workstream E** · PR-ready notes when `jettoptx-jtx-trade` (or agents host) is writable.  
**Target CTA URL:** https://wealth.astroknots.space  
**No secrets.** Money mode on wealth UI remains dry-run / JTX gate only.

---

## Context

| Surface | Status (2026-07-26) |
|---------|---------------------|
| https://jtx.astroknots.space/agents | 200 SPA (Astro Knots / agents rails) |
| https://wealth.astroknots.space | 200 Wealth-08 MOA / dry-run UI |
| https://jtx.trade | 308 front door |
| Private repo `jettoptx/jettoptx-jtx-trade` | **not cloned** (gh 401) |
| Local dapp zip | `OPTX-windows/8-Wealth/JTX Trade DApp.zip` — **no `/agents` route yet** |
| Local wealth UI | `OPTX-windows/8-Wealth/xwealth-ui` → deploys wealth.astroknots.space |

Because the private trade repo is unavailable, this document is the **deeplink spec + suggested diffs** to apply once clone/auth works. Optional mirror patches can land on the zip-derived app or the agents host repo that serves `jtx.astroknots.space/agents`.

---

## Product intent

Agents browsing the **Agents** storefront should get a clear card/CTA into **Wealth-08** for JTX-gated dry-run training — not LIVE settlement.

```
/agents  →  card "X Wealth / Augment-08"  →  https://wealth.astroknots.space
optional:  /agents/xwealth  →  302/rewrite to wealth.astroknots.space
```

Copy constraints:

- No Privy language on wealth surfaces.  
- Label **dry-run / paper** explicitly.  
- Do not promise LIVE trading from the CTA.

---

## Suggested vercel.json (agents or jtx-trade host)

If the agents app is on Vercel, add redirect/rewrite (merge carefully with existing rules):

```json
{
  "redirects": [
    {
      "source": "/agents/xwealth",
      "destination": "https://wealth.astroknots.space",
      "permanent": false
    },
    {
      "source": "/xwealth",
      "destination": "https://wealth.astroknots.space",
      "permanent": false
    }
  ]
}
```

For a Vite SPA that already SPA-fallbacks all non-API routes, prefer an **in-app route** plus the external CTA rather than fighting the SPA rewrite.

---

## Suggested UI card (React)

```tsx
// e.g. src/components/AgentsWealthCard.tsx
const WEALTH_URL = "https://wealth.astroknots.space";

export function AgentsWealthCard() {
  return (
    <a
      href={WEALTH_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="agents-card agents-card--wealth"
      data-testid="agents-wealth-cta"
    >
      <h3>X Wealth · Augment-08</h3>
      <p>
        JTX-gated dry-run rails for agent money links and paper training.
        No LIVE sends from this door.
      </p>
      <span className="agents-card__cta">Open wealth.astroknots.space →</span>
    </a>
  );
}
```

Mount on the Agents index / storefront grid next to existing skill/catalog cards.

---

## Suggested App route (jtx-trade zip baseline)

Zip `App.tsx` routes today: `/`, `/mint`, `/collection`, `/admin/deploy`.

Add:

```tsx
// optional thin bounce page if you want same-origin /agents/xwealth before redirect
<Route path="/agents/xwealth" element={<WealthRedirect />} />
```

```tsx
// WealthRedirect.tsx
import { useEffect } from "react";

const WEALTH = "https://wealth.astroknots.space";

export default function WealthRedirect() {
  useEffect(() => {
    window.location.replace(WEALTH);
  }, []);
  return (
    <p>
      Redirecting to <a href={WEALTH}>wealth.astroknots.space</a> (dry-run)…
    </p>
  );
}
```

---

## Header / nav link

If `Header.tsx` has nav items, add:

| Label | Href | Note |
|-------|------|------|
| Wealth | `https://wealth.astroknots.space` | external, `rel="noopener noreferrer"` |
| Agents | `/agents` or `https://jtx.astroknots.space/agents` | existing |

---

## Agent-catalog JSON (machine-readable)

If `/.well-known/agent-catalog.json` or storefront listings exist, add listing:

```json
{
  "id": "xwealth-augment-08",
  "name": "X Wealth",
  "description": "JTX-gated dry-run wealth rails for agents (Augment-08). Paper training via jtx-trade-paper MCP.",
  "url": "https://wealth.astroknots.space",
  "tags": ["jtx", "wealth-08", "dry-run", "x402", "paper"],
  "mode": "dry-run",
  "mcp": "jtx-trade-paper",
  "related": [
    "https://jtx.astroknots.space/x402",
    "https://jtx.astroknots.space/agents"
  ]
}
```

---

## Acceptance checks

- [ ] CTA visible on Agents storefront without login wall that blocks agents.  
- [ ] Click → `https://wealth.astroknots.space` (200).  
- [ ] `/agents/xwealth` redirects or bounces to wealth (if implemented).  
- [ ] Copy says dry-run / paper; no LIVE claim.  
- [ ] No Privy. No secrets in client bundle from this change.  
- [ ] Optional: catalog JSON lists xwealth entry.

---

## Related local paths

| Path | Role |
|------|------|
| `repos/jettoptx/jettoptx-xwealth/mcp/jtx-trade-paper/` | paper MCP stub |
| `repos/jettoptx/jettoptx-xwealth/docs/PAPER-MCP.md` | MCP design |
| `OPTX-windows/8-Wealth/xwealth-ui/` | wealth.astroknots.space source |
| `OPTX-windows/8-Wealth/JTX Trade DApp.zip` | trade UI snapshot |
| `repos/drafts/JTX-TRADE-AGENT-STOREFRONT.md` | product direction lock |

---

## Blocker

Applying the code patch in-repo is **blocked** until `jettoptx/jettoptx-jtx-trade` (or the actual agents host repo) is cloneable. This file is the complete patch brief for that PR.
