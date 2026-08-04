#!/usr/bin/env python3
"""
JTX Trade paper MCP server (stdio).

Tools (all default paper/dry-run; LIVE refused):
  - jtx_health
  - jtx_markets_snapshot
  - jtx_paper_balance
  - jtx_paper_order
  - jtx_paper_pnl
  - jtx_x402_catalog
  - jtx_uw_paper_terminal  (Unusual Whales composite board = paper terminal eyes)
  - jtx_uw_market_tide / jtx_uw_flow_alerts / jtx_uw_darkpool_recent / jtx_uw_ticker_flow
  - jtx_uw_news / jtx_uw_screener_options / jtx_uw_screener_stocks

UW paper terminal:
  Dashboard: https://unusualwhales.com/dashboard/api
  REST: https://api.unusualwhales.com
  Official MCP (full tool surface): @unusualwhales/mcp — see hermes.mcp.example.yaml

UW key from env only (UW_API_KEY). No secrets in responses. No private keys. No chain sends.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any

from mcp.server.fastmcp import FastMCP

import paper_state as ps
import uw_client as uw

X402_URL = os.environ.get("JTX_X402_URL", "https://jtx.astroknots.space/x402")
WEALTH_URL = "https://wealth.astroknots.space"
AGENTS_URL = "https://jtx.astroknots.space/agents"
JTX_TRADE_URL = "https://jtx.trade"

mcp = FastMCP(
    "jtx-trade-paper",
    instructions=(
        "JTX Trade paper trainer MCP for OPTX Wealth-08. "
        "All tools are dry-run/paper by default. LIVE is refused. "
        "Primary paper-terminal eyes: Unusual Whales REST via jtx_uw_paper_terminal "
        "(dashboard https://unusualwhales.com/dashboard/api; REST api.unusualwhales.com). "
        "For the full UW surface use Hermes mcp_servers.unusualwhales (@unusualwhales/mcp). "
        "UW data is market-data signals only — never auto-trade. "
        "x402 catalog is a public GET proxy."
    ),
)


def _json(data: Any) -> str:
    return json.dumps(data, indent=2, default=str)


@mcp.tool()
def jtx_health() -> str:
    """Health + mode flags for the JTX Trade paper MCP (no secrets)."""
    env_live = os.environ.get("JTX_LIVE", "").strip() == "1"
    payload = {
        "ok": True,
        "service": "jtx-trade-paper",
        "version": "0.3.0",
        "mode_default": "paper",
        "live_enabled": False,
        "jtx_live_env": env_live,
        "live_policy": "Refuse LIVE unless JTX_LIVE=1 AND explicit tool live=true; stub still has no LIVE backend",
        "tools": [
            "jtx_health",
            "jtx_markets_snapshot",
            "jtx_paper_balance",
            "jtx_paper_order",
            "jtx_paper_pnl",
            "jtx_x402_catalog",
            "jtx_uw_paper_terminal",
            "jtx_uw_market_tide",
            "jtx_uw_flow_alerts",
            "jtx_uw_darkpool_recent",
            "jtx_uw_ticker_flow",
            "jtx_uw_news",
            "jtx_uw_screener_options",
            "jtx_uw_screener_stocks",
        ],
        "rails": {
            "x402_catalog": X402_URL,
            "wealth_ui": WEALTH_URL,
            "agents": AGENTS_URL,
            "jtx_trade": JTX_TRADE_URL,
            "uw_dashboard": uw.DASHBOARD_URL,
        },
        "unusual_whales": {
            "configured": uw.configured(),
            "paper_terminal": "jtx_uw_paper_terminal",
            "dashboard": uw.DASHBOARD_URL,
            "mcp": "hermes mcp_servers.unusualwhales (@unusualwhales/mcp stdio)",
            "rest": uw.BASE,
            "docs": uw.DOCS_URL,
            "mcp_docs": uw.MCP_DOCS_URL,
            "skill": uw.SKILL_URL,
        },
        "private_repo": "jettoptx/jettoptx-jtx-trade (clone may 401; this stub lives in public xwealth)",
        "data_dir": str(ps.DATA_DIR),
    }
    return _json(payload)


@mcp.tool()
def jtx_markets_snapshot() -> str:
    """Synthetic paper market snapshot (SOL/JTX/USDC + MiroShark PM stub). Not live Jupiter/Meteora."""
    return _json(ps.markets_snapshot())


@mcp.tool()
def jtx_paper_balance(reset: bool = False) -> str:
    """
    Return paper balances from the local ledger.

    Args:
        reset: If true, wipe ledger back to default paper starting balances.
    """
    if reset:
        state = ps.reset_ledger()
        return _json(
            {
                "ok": True,
                "reset": True,
                "mode": "paper",
                "balances": state["balances"],
                "updated_at": state["updated_at"],
            }
        )
    return _json({"ok": True, **ps.get_balances()})


@mcp.tool()
def jtx_paper_order(
    side: str,
    symbol: str,
    size: float,
    order_type: str = "market",
    limit_price: float | None = None,
    mode: str = "paper",
    live: bool = False,
    note: str = "",
) -> str:
    """
    Simulate a paper order fill and update the local ledger. Never sends on-chain.

    Args:
        side: buy or sell
        symbol: e.g. SOL/USDC, JTX/USDC, SOL, or paper market id
        size: base size (positive)
        order_type: market (default) or limit
        limit_price: optional limit price when order_type=limit
        mode: must stay paper/dry-run; LIVE is refused
        live: must remain false; LIVE refused without full policy + backend
        note: optional trainer note
    """
    result = ps.paper_order(
        side=side,
        symbol=symbol,
        size=float(size),
        order_type=order_type or "market",
        limit_price=limit_price,
        mode=mode or "paper",
        live=bool(live),
        note=note or "",
    )
    return _json(result)


@mcp.tool()
def jtx_paper_pnl() -> str:
    """Mark-to-market paper PnL using synthetic mids. Not real P&L."""
    return _json({"ok": True, **ps.paper_pnl()})


@mcp.tool()
def jtx_x402_catalog() -> str:
    """
    Proxy GET https://jtx.astroknots.space/x402 (public catalog).
    Read-only; does not pay or sign. No secrets returned beyond public payTo.
    """
    url = X402_URL
    try:
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json,text/plain,*/*",
                "User-Agent": "jtx-trade-paper-mcp/0.3",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            status = getattr(resp, "status", 200)
        try:
            catalog = json.loads(body)
        except json.JSONDecodeError:
            catalog = {"raw": body[:8000]}
        return _json(
            {
                "ok": True,
                "mode": "read-only",
                "url": url,
                "http_status": status,
                "catalog": catalog,
                "note": "Public x402 discovery only. Paying requires separate wallet flow; not this MCP.",
            }
        )
    except urllib.error.HTTPError as e:
        return _json(
            {
                "ok": False,
                "error": "http_error",
                "url": url,
                "http_status": e.code,
                "message": str(e),
            }
        )
    except Exception as e:  # noqa: BLE001
        return _json(
            {
                "ok": False,
                "error": "fetch_failed",
                "url": url,
                "message": str(e),
            }
        )


@mcp.tool()
def jtx_uw_paper_terminal(
    ticker: str = "SPY",
    flow_limit: int = 5,
    darkpool_limit: int = 5,
    news_limit: int = 5,
    screener_limit: int = 5,
) -> str:
    """
    Paper terminal board from Unusual Whales REST (signals only).

    Pulls market tide, flow alerts, dark pool, ticker flow, net premium ticks,
    options volume, news, and screeners into one board for paper decisions.
    Keys/usage: https://unusualwhales.com/dashboard/api
    Full UW tool surface: Hermes unusualwhales MCP (@unusualwhales/mcp).
    Never auto-executes trades.

    Args:
        ticker: focus ticker (default SPY)
        flow_limit: max flow rows per section
        darkpool_limit: max darkpool prints
        news_limit: max headlines
        screener_limit: max screener rows
    """
    return _json(
        uw.paper_terminal(
            ticker=ticker,
            flow_limit=flow_limit,
            darkpool_limit=darkpool_limit,
            news_limit=news_limit,
            screener_limit=screener_limit,
        )
    )


@mcp.tool()
def jtx_uw_market_tide() -> str:
    """Unusual Whales market tide (call/put premium net). Paper signal only — not LIVE."""
    return _json(uw.market_tide())


@mcp.tool()
def jtx_uw_flow_alerts(limit: int = 20, ticker_symbol: str = "") -> str:
    """
    Unusual Whales options flow alerts.

    Args:
        limit: max alerts (default 20)
        ticker_symbol: optional ticker filter e.g. SPY
    """
    return _json(uw.flow_alerts(limit=limit, ticker_symbol=ticker_symbol or None))


@mcp.tool()
def jtx_uw_darkpool_recent(limit: int = 20) -> str:
    """Unusual Whales recent dark pool prints. Paper signal only."""
    return _json(uw.darkpool_recent(limit=limit))


@mcp.tool()
def jtx_uw_ticker_flow(ticker: str) -> str:
    """
    Recent options flow for a ticker via Unusual Whales.

    Args:
        ticker: equity ticker e.g. NVDA
    """
    return _json(uw.ticker_flow(ticker))


@mcp.tool()
def jtx_uw_news(
    limit: int = 10,
    command: str = "headlines",
    ticker: str = "",
) -> str:
    """Unusual Whales news headlines. Paper signal only.

    Prefer this tool over official unusualwhales ``uw_news``.

    Args:
        limit: max headlines (default 10)
        command: must be ``headlines`` (accepted for model/schema compatibility
            with @unusualwhales/mcp ``uw_news`` which requires command=headlines)
        ticker: optional equity ticker filter (empty = market-wide)
    """
    cmd = (command or "headlines").strip().lower()
    if cmd and cmd not in ("headlines", "news", "headline"):
        return _json(
            {
                "ok": False,
                "error": "invalid_command",
                "message": "jtx_uw_news only supports command='headlines'",
                "got": command,
            }
        )
    # REST client currently market-wide; ticker reserved for future filter
    result = uw.news_headlines(limit=limit)
    if ticker and isinstance(result, dict):
        result = {**result, "ticker_filter": ticker.upper(), "note": "ticker filter best-effort; REST may be market-wide"}
    return _json(result)


@mcp.tool()
def jtx_uw_screener_options(limit: int = 10, min_premium: int = 0) -> str:
    """
    Unusual Whales options screener (hottest chains). Paper signal only.

    Args:
        limit: max contracts
        min_premium: optional minimum premium filter (0 = omit)
    """
    mp = int(min_premium) if min_premium and int(min_premium) > 0 else None
    return _json(uw.screener_option_contracts(limit=limit, min_premium=mp))


@mcp.tool()
def jtx_uw_screener_stocks(limit: int = 10) -> str:
    """Unusual Whales stock screener. Paper signal only."""
    return _json(uw.screener_stocks(limit=limit))


def main() -> None:
    ps.ensure_state()
    mcp.run(transport="stdio")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
