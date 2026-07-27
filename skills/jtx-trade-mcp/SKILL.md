---
name: jtx-trade-mcp
description: "Use when JTX Trade paper MCP or jtx_paper_* tools."
version: 0.1.0
author: AstroJOE / jettoptx
license: MIT
metadata:
  hermes:
    tags: [jtx, trade, mcp, paper, wealth-08, x402, dry-run]
    related_skills: [xwealth, x402-pay-superpowers, miroshark-swarm-engine, native-mcp]
  short-description: "JTX Trade paper MCP (dry-run)"
  augment: wealth-08
---

# jtx-trade-mcp

Paper trainer for **JTX Trade** / Wealth-08. Public path: `jettoptx-xwealth/mcp/jtx-trade-paper/`.

**Default: dry-run / paper only. Refuse LIVE.** No secrets.

## Paths

| Item | Path |
|------|------|
| Server (stdio MCP) | `C:/Users/joshu/repos/jettoptx/jettoptx-xwealth/mcp/jtx-trade-paper/server.py` |
| CLI (no MCP SDK) | `.../cli.py` |
| Design | `.../docs/PAPER-MCP.md` |
| Deeplink PR notes | `.../docs/AGENTS-DEEPLINK-PATCH.md` |
| Hermes YAML | `.../mcp/jtx-trade-paper/hermes.mcp.example.yaml` |
| In-repo skill | `.../skills/jtx-trade-mcp/SKILL.md` |

## Tools

| Tool | Use |
|------|-----|
| `jtx_health` | Health, rails, LIVE policy |
| `jtx_markets_snapshot` | Synthetic markets |
| `jtx_paper_balance` | Paper balances; `reset=true` |
| `jtx_paper_order` | Simulated fill (`side`,`symbol`,`size`) |
| `jtx_paper_pnl` | Paper MTM PnL |
| `jtx_x402_catalog` | GET `https://jtx.astroknots.space/x402` |

MCP names after register: `mcp_jtx_trade_paper_jtx_*`.

## Hermes config

```yaml
mcp_servers:
  jtx_trade_paper:
    command: "python"
    args:
      - "C:/Users/joshu/repos/jettoptx/jettoptx-xwealth/mcp/jtx-trade-paper/server.py"
    timeout: 60
    connect_timeout: 30
```

Optional ledger isolation:

```yaml
    env:
      JTX_PAPER_DATA_DIR: "C:/Users/joshu/AppData/Local/hermes/profiles/astrojoe/data/jtx-paper"
```

Do **not** set `JTX_LIVE=1` unless human enables LIVE and a real backend exists.

## CLI quick path

```bash
cd C:/Users/joshu/repos/jettoptx/jettoptx-xwealth
python mcp/jtx-trade-paper/cli.py jtx_health
python mcp/jtx-trade-paper/cli.py jtx_x402_catalog
python mcp/jtx-trade-paper/cli.py jtx_paper_order '{"side":"buy","symbol":"SOL/USDC","size":1}'
python mcp/jtx-trade-paper/smoke_test.py
```

## Procedure

1. Prefer MCP tools if connected; else CLI/smoke.
2. Loop: health → markets → paper_order → paper_pnl.
3. Catalog: `jtx_x402_catalog` (read-only).
4. Wealth UI: https://wealth.astroknots.space
5. Agents → wealth deeplink: apply `docs/AGENTS-DEEPLINK-PATCH.md` when private trade repo is writable.

## LIVE policy

- Default **paper**.
- `mode=LIVE` / `live=true` without `JTX_LIVE=1` → `LIVE_REFUSED`.
- Even with both → `LIVE_NOT_IMPLEMENTED` on this stub.
- Never log private keys. Never treat synthetic mids as live Jupiter.

## Clone note

`gh repo clone jettoptx/jettoptx-jtx-trade` may **401**. Local dapp snapshot: `OPTX-windows/8-Wealth/JTX Trade DApp.zip`.

## Do not

- LIVE sends · secrets in git · Privy on wealth · block on private clone
