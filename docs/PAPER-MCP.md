# JTX Trade — Paper MCP design

**Status:** stub shipped in public `jettoptx-xwealth`  
**Date:** 2026-07-26  
**Money mode:** dry-run / paper only · LIVE refused  
**No secrets**

---

## Why here (not jettoptx-jtx-trade)

| Item | Result |
|------|--------|
| `gh repo clone jettoptx/jettoptx-jtx-trade` | **401 Bad credentials** (private) |
| Local path `repos/jettoptx/jettoptx-jtx-trade` | **missing** |
| Fallback | Scaffold under `mcp/jtx-trade-paper/` in **public** xwealth |
| Local dapp snapshot | `OPTX-windows/8-Wealth/JTX Trade DApp.zip` (May 2026 Vite app) |

When private clone works, promote or mirror this MCP into that repo and keep xwealth as the shared paper trainer surface.

---

## Architecture

```
Hermes / Grok / agent
        │ stdio MCP
        ▼
jtx-trade-paper (this package)
        ├── paper ledger JSON (local)
        ├── synthetic markets
        └── GET jtx.astroknots.space/x402  (public catalog only)
        │
        ▼ (future)
jettoptx-jtx-trade LIVE executor  ← gated: JTX_LIVE=1 AND live=true AND real backend
```

Downstream UX gate (no trading execution):

- https://wealth.astroknots.space — JTX-gated dry-run UI  
- https://jtx.astroknots.space/agents — agents storefront  
- https://jtx.trade — 308 front door  

---

## Tools

| Tool | Behavior |
|------|----------|
| `jtx_health` | ok, version, rails URLs, LIVE policy |
| `jtx_markets_snapshot` | synthetic SOL/JTX/USDC + MiroShark PM stub |
| `jtx_paper_balance` | read ledger; `reset=true` restores defaults |
| `jtx_paper_order` | simulated fill; updates balances; **no chain** |
| `jtx_paper_pnl` | MTM vs starting paper book |
| `jtx_x402_catalog` | proxy public GET `/x402` |

Default starting paper book: `10000 USDC`, `50 SOL`, `1000 JTX`.

---

## LIVE boundary (hard)

1. Default `mode=paper`.  
2. If caller sets `mode=LIVE` or `live=true` without `JTX_LIVE=1` → `LIVE_REFUSED`.  
3. If both env + flag set → still `LIVE_NOT_IMPLEMENTED` on this stub (no executor).  
4. Never commit keys, never print key material, never hit settle endpoints.

Aligns with xwealth `runDryRun` LIVE hard-block.

---

## Inventory map (from local zip + live rails)

### UI routes (JTX Trade DApp.zip)

| Route | Role |
|-------|------|
| `/` | Index / hero + swap panels |
| `/mint` | Mint flow |
| `/collection` | Space Cowboys collection |
| `/admin/deploy` | Admin deploy |

### Client libs (paper-map only)

| Module | Future MCP hook |
|--------|-----------------|
| `JupiterSwapService` | live swap quotes → replace synthetic mids |
| `MeteoraPoolService` | DLMM pool snapshot |
| `VaultService` | vault positions |
| `JitoService` | bundle tips (LIVE only, never paper) |
| `SpaceCowboysService` / CSTB | NFT / DePIN side paths |
| `CoinGeckoService` | external marks |

### Live public rails (verified HTTP)

| URL | Role |
|-----|------|
| `https://jtx.astroknots.space/x402` | x402 catalog JSON (payTo faucet domain) |
| `https://jtx.astroknots.space/agents` | agents SPA |
| `https://wealth.astroknots.space` | Wealth-08 UI |
| `https://jtx.trade` | brand front door (308) |

---

## Paths

```
jettoptx-xwealth/
  mcp/jtx-trade-paper/
    server.py              # FastMCP stdio
    paper_state.py         # ledger + markets
    requirements.txt
    hermes.mcp.example.yaml
    README.md
    data/ledger.json       # created at runtime
  docs/PAPER-MCP.md        # this file
  docs/AGENTS-DEEPLINK-PATCH.md
  skills/jtx-trade-mcp/SKILL.md
```

---

## Run / verify

```bash
cd C:/Users/joshu/repos/jettoptx/jettoptx-xwealth
python mcp/jtx-trade-paper/server.py   # stdio MCP
# unit-style:
python mcp/jtx-trade-paper/smoke_test.py
```

Hermes: merge `hermes.mcp.example.yaml` into profile `config.yaml`, restart agent. Tools appear as `mcp_jtx_trade_paper_jtx_*`.

---

## Next (when private repo available)

1. Clone `jettoptx/jettoptx-jtx-trade`.  
2. Diff zip ↔ repo; wire real read-only quote adapters behind feature flag.  
3. Keep paper ledger as default; LIVE executor behind double gate.  
4. Apply Agents → wealth deeplink PR (see AGENTS-DEEPLINK-PATCH.md).
