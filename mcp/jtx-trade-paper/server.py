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

No secrets. No private keys. No chain sends.
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

X402_URL = os.environ.get("JTX_X402_URL", "https://jtx.astroknots.space/x402")
WEALTH_URL = "https://wealth.astroknots.space"
AGENTS_URL = "https://jtx.astroknots.space/agents"
JTX_TRADE_URL = "https://jtx.trade"

mcp = FastMCP(
    "jtx-trade-paper",
    instructions=(
        "JTX Trade paper trainer MCP for OPTX Wealth-08. "
        "All tools are dry-run/paper by default. LIVE is refused. "
        "No secrets. x402 catalog is a public GET proxy."
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
        "version": "0.1.0",
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
        ],
        "rails": {
            "x402_catalog": X402_URL,
            "wealth_ui": WEALTH_URL,
            "agents": AGENTS_URL,
            "jtx_trade": JTX_TRADE_URL,
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
                "User-Agent": "jtx-trade-paper-mcp/0.1",
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
        # Redact nothing critical — catalog is public — but never invent keys
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
    except Exception as e:  # noqa: BLE001 — surface network failures to agent
        return _json(
            {
                "ok": False,
                "error": "fetch_failed",
                "url": url,
                "message": str(e),
            }
        )


def main() -> None:
    # Ensure ledger exists on boot
    ps.ensure_state()
    mcp.run(transport="stdio")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
