# jtx-trade-paper MCP

Paper / dry-run MCP + CLI trainer for **JTX Trade** (Wealth-08).

Lives in public `jettoptx-xwealth` because private `jettoptx/jettoptx-jtx-trade` may be unclonable (gh 401).

## Paper terminal (Unusual Whales)

| | |
|--|--|
| Keys / usage | https://unusualwhales.com/dashboard/api |
| REST | `https://api.unusualwhales.com` |
| Official MCP | `@unusualwhales/mcp` — https://unusualwhales.com/public-api/mcp |
| Composite tool | **`jtx_uw_paper_terminal`** (signals only → then `jtx_paper_order`) |

Env: `UW_API_KEY` (never commit). See `hermes.mcp.example.yaml` for both MCPs.

## Tools

| Tool | Purpose |
|------|---------|
| `jtx_health` | Service health, rails URLs, LIVE policy |
| `jtx_markets_snapshot` | Synthetic SOL/JTX/USDC + PM stubs |
| `jtx_paper_balance` | Local paper balances (`reset=true` wipes) |
| `jtx_paper_order` | Simulated fill log only |
| `jtx_paper_pnl` | Mark-to-market paper PnL |
| `jtx_x402_catalog` | GET `https://jtx.astroknots.space/x402` |
| `jtx_uw_paper_terminal` | **UW paper board** (tide/flow/darkpool/news/screeners) |
| `jtx_uw_*` | Individual UW REST helpers |

## Safety

- **Default mode: paper.** No chain sends. No private keys.
- **LIVE refused** unless `JTX_LIVE=1` **and** tool `live=true` — stub still returns `LIVE_NOT_IMPLEMENTED`.
- Ledger is local JSON under `data/` (gitignored).

## Run CLI (no MCP SDK)

```bash
python mcp/jtx-trade-paper/cli.py jtx_health
python mcp/jtx-trade-paper/cli.py jtx_uw_paper_terminal '{"ticker":"SPY"}'
python mcp/jtx-trade-paper/cli.py jtx_x402_catalog
python mcp/jtx-trade-paper/cli.py jtx_markets_snapshot
python mcp/jtx-trade-paper/cli.py jtx_paper_balance
python mcp/jtx-trade-paper/cli.py jtx_paper_order '{"side":"buy","symbol":"SOL/USDC","size":1}'
python mcp/jtx-trade-paper/cli.py jtx_paper_pnl
```

## Run MCP stdio (needs `mcp` package)

```bash
python mcp/jtx-trade-paper/server.py
# or
npm run mcp:paper
npm run mcp:paper:smoke
```

## Hermes config

See `hermes.mcp.example.yaml` and skill `jtx-trade-mcp`.

```yaml
mcp_servers:
  jtx_trade_paper:
    command: "python"
    args:
      - "C:/Users/joshu/repos/jettoptx/jettoptx-xwealth/mcp/jtx-trade-paper/server.py"
    timeout: 60
```

## Docs

| Doc | Path |
|-----|------|
| Design / inventory | [`../../docs/PAPER-MCP.md`](../../docs/PAPER-MCP.md) |
| Agents → wealth deeplink | [`../../docs/AGENTS-DEEPLINK-PATCH.md`](../../docs/AGENTS-DEEPLINK-PATCH.md) · local short notes [`AGENTS-DEEPLINK.md`](./AGENTS-DEEPLINK.md) |
| Quant stack arch | [`../../docs/AUGMENT08-QUANT-STACK.md`](../../docs/AUGMENT08-QUANT-STACK.md) |
| In-repo skill | [`../../skills/jtx-trade-mcp/SKILL.md`](../../skills/jtx-trade-mcp/SKILL.md) |

## Inventory source

- Local zip: `OPTX-windows/8-Wealth/JTX Trade DApp.zip` (Jupiter/Meteora/Vault UI)
- Routes: `/`, `/mint`, `/collection`, `/admin/deploy`
