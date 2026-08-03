#!/usr/bin/env python3
"""CLI driver for jtx-trade-paper tools (no MCP SDK required)."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any

import paper_state as ps
import uw_client as uw

X402_URL = os.environ.get("JTX_X402_URL", "https://jtx.astroknots.space/x402")
WEALTH_URL = "https://wealth.astroknots.space"
AGENTS_URL = "https://jtx.astroknots.space/agents"
JTX_TRADE_URL = "https://jtx.trade"


def _print(data: Any) -> None:
    print(json.dumps(data, indent=2, default=str))


def jtx_health() -> dict:
    def code(url: str) -> int:
        try:
            req = urllib.request.Request(url, method="GET", headers={"User-Agent": "jtx-paper-cli/0.3"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return getattr(r, "status", 200)
        except urllib.error.HTTPError as e:
            return e.code
        except Exception:
            return 0

    w, x, a = code(WEALTH_URL), code(X402_URL), code(AGENTS_URL)
    return {
        "ok": w == 200 and x == 200,
        "service": "jtx-trade-paper-cli",
        "mode_default": "paper",
        "live_enabled": False,
        "rails": {
            "wealth_ui": {"url": WEALTH_URL, "http": w},
            "x402": {"url": X402_URL, "http": x},
            "agents": {"url": AGENTS_URL, "http": a},
            "jtx_trade": JTX_TRADE_URL,
            "uw_dashboard": uw.DASHBOARD_URL,
        },
        "data_dir": str(ps.DATA_DIR),
        "unusual_whales": {
            "configured": uw.configured(),
            "paper_terminal": "jtx_uw_paper_terminal",
            "dashboard": uw.DASHBOARD_URL,
            "rest": uw.BASE,
            "docs": uw.DOCS_URL,
            "mcp_docs": uw.MCP_DOCS_URL,
            "skill": uw.SKILL_URL,
        },
    }


def jtx_x402_catalog() -> dict:
    try:
        req = urllib.request.Request(
            X402_URL,
            headers={"Accept": "application/json", "User-Agent": "jtx-paper-cli/0.3"},
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            status = getattr(resp, "status", 200)
        return {"ok": True, "http_status": status, "catalog": json.loads(body), "mode": "read-only"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def main(argv: list[str]) -> int:
    ps.ensure_state()
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(
            "usage: cli.py <jtx_health|jtx_markets_snapshot|jtx_paper_balance|"
            "jtx_paper_order|jtx_paper_pnl|jtx_x402_catalog|"
            "jtx_uw_paper_terminal|jtx_uw_market_tide|jtx_uw_flow_alerts|"
            "jtx_uw_darkpool_recent|jtx_uw_ticker_flow|jtx_uw_news|"
            "jtx_uw_screener_options|jtx_uw_screener_stocks>"
            " [json_args]"
        )
        return 0
    tool = argv[1]
    args = json.loads(argv[2]) if len(argv) > 2 else {}
    if tool == "jtx_health":
        _print(jtx_health())
    elif tool == "jtx_markets_snapshot":
        _print(ps.markets_snapshot())
    elif tool == "jtx_paper_balance":
        if args.get("reset"):
            st = ps.reset_ledger()
            _print({"ok": True, "reset": True, "balances": st["balances"]})
        else:
            _print({"ok": True, **ps.get_balances()})
    elif tool == "jtx_paper_order":
        _print(
            ps.paper_order(
                side=str(args.get("side") or "buy"),
                symbol=str(args.get("symbol") or "SOL/USDC"),
                size=float(args.get("size") or args.get("qty") or 0),
                order_type=str(args.get("order_type") or "market"),
                limit_price=args.get("limit_price") or args.get("price"),
                mode=str(args.get("mode") or "paper"),
                live=bool(args.get("live") or False),
                note=str(args.get("note") or "cli"),
            )
        )
    elif tool == "jtx_paper_pnl":
        _print({"ok": True, **ps.paper_pnl()})
    elif tool == "jtx_x402_catalog":
        _print(jtx_x402_catalog())
    elif tool == "jtx_uw_paper_terminal":
        _print(
            uw.paper_terminal(
                ticker=str(args.get("ticker") or "SPY"),
                flow_limit=int(args.get("flow_limit") or 5),
                darkpool_limit=int(args.get("darkpool_limit") or 5),
                news_limit=int(args.get("news_limit") or 5),
                screener_limit=int(args.get("screener_limit") or 5),
            )
        )
    elif tool == "jtx_uw_market_tide":
        _print(uw.market_tide())
    elif tool == "jtx_uw_flow_alerts":
        _print(
            uw.flow_alerts(
                limit=int(args.get("limit") or 20),
                ticker_symbol=args.get("ticker_symbol") or args.get("ticker"),
            )
        )
    elif tool == "jtx_uw_darkpool_recent":
        _print(uw.darkpool_recent(limit=int(args.get("limit") or 20)))
    elif tool == "jtx_uw_ticker_flow":
        _print(uw.ticker_flow(str(args.get("ticker") or args.get("symbol") or "")))
    elif tool == "jtx_uw_news":
        _print(uw.news_headlines(limit=int(args.get("limit") or 10)))
    elif tool == "jtx_uw_screener_options":
        mp = args.get("min_premium")
        _print(
            uw.screener_option_contracts(
                limit=int(args.get("limit") or 10),
                min_premium=int(mp) if mp not in (None, "", 0, "0") else None,
            )
        )
    elif tool == "jtx_uw_screener_stocks":
        _print(uw.screener_stocks(limit=int(args.get("limit") or 10)))
    else:
        _print({"ok": False, "error": f"unknown tool {tool}"})
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
