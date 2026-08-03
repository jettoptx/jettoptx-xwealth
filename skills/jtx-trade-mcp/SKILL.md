---
name: jtx-trade-mcp
description: "Use when JTX Trade paper MCP, jtx_paper_*, jtx_uw_*, or UW paper terminal."
version: 0.3.0
author: AstroJOE / jettoptx
license: MIT
metadata:
  hermes:
    tags: [jtx, trade, mcp, paper, wealth-08, x402, dry-run, unusual-whales]
    related_skills: [xwealth, x402-pay-superpowers, miroshark-swarm-engine, native-mcp, traderjoe-terminal]
  short-description: "JTX Trade paper MCP + UW paper terminal"
  augment: wealth-08
---

# jtx-trade-mcp

Paper trainer for **JTX Trade** / Wealth-08. Public path: `jettoptx-xwealth/mcp/jtx-trade-paper/`.

**Default: dry-run / paper only. Refuse LIVE.** No secrets.

## Paper terminal = Unusual Whales

| Surface | URL / package |
|---------|----------------|
| API keys / usage dashboard | https://unusualwhales.com/dashboard/api |
| REST base | `https://api.unusualwhales.com` |
| REST docs (Accept: text/plain) | https://api.unusualwhales.com/docs |
| Official MCP docs | https://unusualwhales.com/public-api/mcp |
| Official MCP package | `@unusualwhales/mcp` (stdio) |
| Agent skill | https://unusualwhales.com/skill.md |

**Two complementary MCPs:**

1. **`jtx_trade_paper`** — local paper ledger + composite board `jtx_uw_paper_terminal` (REST)
2. **`unusualwhales`** — official UW MCP (~27 tools: `uw_flow`, `uw_darkpool`, `uw_market`, …)

Loop: **UW board/signals → paper order → paper PnL**. Never auto-LIVE from UW.

Env: `UW_API_KEY` (or `UNUSUAL_WHALES_API_KEY`) + optional `UW_CLIENT_API_ID=100001`. Never commit values.

## Paths

| Item | Path |
|------|------|
| Server (stdio MCP) | `C:/Users/joshu/repos/jettoptx/jettoptx-xwealth/mcp/jtx-trade-paper/server.py` |
| CLI (no MCP SDK) | `.../cli.py` |
| UW REST client | `.../uw_client.py` |
| Design | `.../docs/PAPER-MCP.md` |
| Hermes YAML | `.../mcp/jtx-trade-paper/hermes.mcp.example.yaml` |
| In-repo skill | `.../skills/jtx-trade-mcp/SKILL.md` |

## Tools

| Tool | Use |
|------|-----|
| `jtx_health` | Health, rails, UW configured, LIVE policy |
| `jtx_markets_snapshot` | Synthetic crypto paper markets |
| `jtx_paper_balance` | Paper balances; `reset=true` |
| `jtx_paper_order` | Simulated fill (`side`,`symbol`,`size`) |
| `jtx_paper_pnl` | Paper MTM PnL |
| `jtx_x402_catalog` | GET `https://jtx.astroknots.space/x402` |
| **`jtx_uw_paper_terminal`** | **UW composite board** (tide, flow, darkpool, news, screeners) |
| `jtx_uw_market_tide` | Market tide only |
| `jtx_uw_flow_alerts` | Options flow alerts |
| `jtx_uw_darkpool_recent` | Market-wide dark pool |
| `jtx_uw_ticker_flow` | Ticker recent flow |
| `jtx_uw_news` | Headlines |
| `jtx_uw_screener_options` | Hottest option chains |
| `jtx_uw_screener_stocks` | Stock screener |

MCP names after register: `mcp_jtx_trade_paper_jtx_*`.

## Hermes config

```yaml
mcp_servers:
  jtx_trade_paper:
    command: "python"
    args:
      - "C:/Users/joshu/repos/jettoptx/jettoptx-xwealth/mcp/jtx-trade-paper/server.py"
    timeout: 90
    connect_timeout: 30
  unusualwhales:
    command: "C:/Program Files/nodejs/npx.cmd"
    args: ["-y", "@unusualwhales/mcp"]
    env:
      UW_API_KEY: "${UW_API_KEY}"
      UNUSUAL_WHALES_API_KEY: "${UW_API_KEY}"
      UW_CLIENT_API_ID: "100001"
    enabled: true
    timeout: 120
    connect_timeout: 90
```

Optional ledger isolation:

```yaml
    env:
      JTX_PAPER_DATA_DIR: "C:/Users/joshu/AppData/Local/hermes/profiles/astrojoe/data/jtx-paper"
      UW_API_KEY: "${UW_API_KEY}"
```

Do **not** set `JTX_LIVE=1` unless human enables LIVE and a real backend exists.

## CLI quick path

```bash
cd C:/Users/joshu/repos/jettoptx/jettoptx-xwealth
# load UW_API_KEY from .env into the shell first
python mcp/jtx-trade-paper/cli.py jtx_health
python mcp/jtx-trade-paper/cli.py jtx_uw_paper_terminal '{"ticker":"SPY"}'
python mcp/jtx-trade-paper/cli.py jtx_uw_flow_alerts '{"ticker":"SPY","limit":3}'
python mcp/jtx-trade-paper/cli.py jtx_paper_order '{"side":"buy","symbol":"SOL/USDC","size":1}'
python mcp/jtx-trade-paper/smoke_test.py
hermes mcp test unusualwhales
```

## Procedure

1. Prefer MCP tools if connected; else CLI.
2. **Paper terminal loop:** `jtx_uw_paper_terminal` (or official `uw_*` tools) → decide → `jtx_paper_order` → `jtx_paper_pnl`.
3. Deep UW: Hermes `unusualwhales` MCP (27 tools).
4. Catalog: `jtx_x402_catalog` (read-only).
5. Wealth UI: https://wealth.astroknots.space

## LIVE policy

- Default **paper**.
- `mode=LIVE` / `live=true` without `JTX_LIVE=1` → `LIVE_REFUSED`.
- Even with both → `LIVE_NOT_IMPLEMENTED` on this stub.
- Never log private keys. Never treat UW signals as auto-execute.

## Do not

- LIVE sends · secrets in git · Privy on wealth · auto-trade from UW · block on private clone
