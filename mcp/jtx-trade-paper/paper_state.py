"""
Local paper ledger for JTX Trade MCP.

No secrets. No chain sends. State is JSON on disk under data/.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path
from typing import Any

# Default starting paper balances (not real money)
DEFAULT_BALANCES: dict[str, float] = {
    "USDC": 10_000.0,
    "SOL": 50.0,
    "JTX": 1_000.0,
    "SPCX": 0.0,
}

# Synthetic paper markets (Jupiter/Meteora-shaped stubs for training)
DEFAULT_MARKETS: list[dict[str, Any]] = [
    {
        "id": "paper-sol-usdc",
        "pair": "SOL/USDC",
        "venue": "jupiter-paper",
        "bid": 148.25,
        "ask": 148.35,
        "mid": 148.30,
        "liquidity_usd": 2_500_000,
        "note": "synthetic mid; not a live quote feed",
    },
    {
        "id": "paper-spcx-usdc",
        "pair": "SPCX/USDC",
        "venue": "jtx-equity-paper",
        "bid": 114.50,
        "ask": 115.50,
        "mid": 115.00,
        "liquidity_usd": 250_000,
        "note": "tokenized equity stub for traderJOE ladder (SPCX mint on JTX); mid is synthetic not DexScreener live",
    },
    {
        "id": "paper-jtx-usdc",
        "pair": "JTX/USDC",
        "venue": "meteora-paper",
        "bid": 0.042,
        "ask": 0.044,
        "mid": 0.043,
        "liquidity_usd": 85_000,
        "note": "synthetic; JTX mint docs-only in public rails",
    },
    {
        "id": "paper-jtx-sol",
        "pair": "JTX/SOL",
        "venue": "meteora-paper",
        "bid": 0.00028,
        "ask": 0.00030,
        "mid": 0.00029,
        "liquidity_usd": 40_000,
        "note": "synthetic cross",
    },
    {
        "id": "paper-pm-spcx-week",
        "pair": "PM:SPCX-week-up",
        "venue": "miroshark-paper",
        "bid": 0.48,
        "ask": 0.52,
        "mid": 0.50,
        "liquidity_usd": 5_000,
        "note": "prediction-market stub for Wealth-08 MiroShark sims",
    },
]

DATA_DIR = Path(os.environ.get("JTX_PAPER_DATA_DIR", Path(__file__).resolve().parent / "data"))
STATE_PATH = DATA_DIR / "ledger.json"


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def ensure_state() -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not STATE_PATH.exists():
        state = {
            "version": 1,
            "mode": "paper",
            "created_at": _now(),
            "updated_at": _now(),
            "balances": dict(DEFAULT_BALANCES),
            "orders": [],
            "fills": [],
            "cash_start_usd": float(DEFAULT_BALANCES["USDC"]),
        }
        _write(state)
        return state
    with STATE_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _write(state: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    state["updated_at"] = _now()
    tmp = STATE_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, sort_keys=False)
        f.write("\n")
    tmp.replace(STATE_PATH)


def reset_ledger() -> dict[str, Any]:
    if STATE_PATH.exists():
        STATE_PATH.unlink()
    return ensure_state()


def get_balances() -> dict[str, Any]:
    state = ensure_state()
    return {
        "mode": "paper",
        "balances": state["balances"],
        "updated_at": state["updated_at"],
        "data_path": str(STATE_PATH),
    }


def _mid_for(symbol: str, markets: list[dict[str, Any]] | None = None) -> float | None:
    markets = markets or DEFAULT_MARKETS
    s = symbol.upper().replace("-", "/")
    for m in markets:
        if m["pair"].upper() == s or m["id"] == symbol:
            return float(m["mid"])
        # allow base asset shorthand e.g. SOL means SOL/USDC
        base = m["pair"].split("/")[0].upper()
        if s == base and m["pair"].upper().endswith("/USDC"):
            return float(m["mid"])
    return None


def paper_order(
    *,
    side: str,
    symbol: str,
    size: float,
    order_type: str = "market",
    limit_price: float | None = None,
    mode: str = "paper",
    live: bool = False,
    note: str = "",
) -> dict[str, Any]:
    """Simulate a fill. Never touches chain."""
    refuse = refuse_live(mode=mode, live=live)
    if refuse:
        return refuse

    side_n = side.strip().lower()
    if side_n not in ("buy", "sell"):
        return {"ok": False, "error": "side must be buy|sell", "mode": "paper"}
    if not isinstance(size, (int, float)) or size <= 0:
        return {"ok": False, "error": "size must be a positive number", "mode": "paper"}

    state = ensure_state()
    mid = _mid_for(symbol)
    if mid is None:
        return {
            "ok": False,
            "error": f"unknown paper market for symbol={symbol!r}",
            "known": [m["pair"] for m in DEFAULT_MARKETS],
            "mode": "paper",
        }

    px = float(limit_price) if (order_type == "limit" and limit_price is not None) else mid
    # tiny spread model
    if side_n == "buy":
        px = px * 1.0005
    else:
        px = px * 0.9995

    base, quote = _split_pair(symbol, mid)
    notional = float(size) * px
    bal = state["balances"]

    if side_n == "buy":
        need_quote = notional
        have_quote = float(bal.get(quote, 0.0))
        if have_quote < need_quote:
            return {
                "ok": False,
                "error": "insufficient paper balance",
                "need": {quote: need_quote},
                "have": {quote: have_quote},
                "mode": "paper",
            }
        bal[quote] = have_quote - need_quote
        bal[base] = float(bal.get(base, 0.0)) + float(size)
    else:
        have_base = float(bal.get(base, 0.0))
        if have_base < float(size):
            return {
                "ok": False,
                "error": "insufficient paper balance",
                "need": {base: float(size)},
                "have": {base: have_base},
                "mode": "paper",
            }
        bal[base] = have_base - float(size)
        bal[quote] = float(bal.get(quote, 0.0)) + notional

    order_id = f"po_{uuid.uuid4().hex[:12]}"
    fill_id = f"pf_{uuid.uuid4().hex[:12]}"
    ts = _now()
    order = {
        "id": order_id,
        "side": side_n,
        "symbol": f"{base}/{quote}",
        "size": float(size),
        "order_type": order_type,
        "limit_price": limit_price,
        "status": "filled",
        "created_at": ts,
        "note": note or "",
    }
    fill = {
        "id": fill_id,
        "order_id": order_id,
        "side": side_n,
        "symbol": f"{base}/{quote}",
        "size": float(size),
        "price": px,
        "notional_quote": notional,
        "quote": quote,
        "base": base,
        "filled_at": ts,
        "simulated": True,
    }
    state["orders"].append(order)
    state["fills"].append(fill)
    state["balances"] = bal
    _write(state)
    return {
        "ok": True,
        "mode": "paper",
        "order": order,
        "fill": fill,
        "balances": bal,
        "warning": "PAPER ONLY — no chain transaction",
    }


def _split_pair(symbol: str, mid: float) -> tuple[str, str]:
    s = symbol.upper().replace("-", "/")
    if "/" in s and not s.startswith("PM:"):
        a, b = s.split("/", 1)
        return a, b
    # map shorthand / pm
    for m in DEFAULT_MARKETS:
        if m["id"] == symbol or m["pair"].upper() == s:
            pair = m["pair"]
            if pair.upper().startswith("PM:"):
                return "PM_SPCX", "USDC"
            a, b = pair.split("/", 1)
            return a.upper(), b.upper()
        base = m["pair"].split("/")[0].upper()
        if s == base:
            return base, "USDC"
    return s, "USDC"


def paper_pnl() -> dict[str, Any]:
    state = ensure_state()
    bal = state["balances"]
    mtm = 0.0
    marks: dict[str, float] = {}
    for asset, qty in bal.items():
        q = float(qty)
        if asset == "USDC":
            mtm += q
            marks[asset] = 1.0
            continue
        mid = _mid_for(asset)
        if mid is None:
            marks[asset] = 0.0
            continue
        marks[asset] = mid
        mtm += q * mid

    start = float(state.get("cash_start_usd", DEFAULT_BALANCES["USDC"]))
    # approximate start MTM: USDC start + other defaults marked
    start_mtm = start
    for asset, qty in DEFAULT_BALANCES.items():
        if asset == "USDC":
            continue
        mid = _mid_for(asset) or 0.0
        start_mtm += float(qty) * mid

    pnl = mtm - start_mtm
    return {
        "mode": "paper",
        "balances": bal,
        "marks_usd": marks,
        "mtm_usd": round(mtm, 6),
        "start_mtm_usd": round(start_mtm, 6),
        "pnl_usd": round(pnl, 6),
        "fills_count": len(state.get("fills", [])),
        "orders_count": len(state.get("orders", [])),
        "updated_at": state.get("updated_at"),
    }


def markets_snapshot() -> dict[str, Any]:
    # lightly jitter mids so trainers see movement without live feeds
    import random

    out = []
    for m in DEFAULT_MARKETS:
        jitter = 1.0 + random.uniform(-0.002, 0.002)
        mid = float(m["mid"]) * jitter
        spread = (float(m["ask"]) - float(m["bid"])) / 2.0
        out.append(
            {
                **m,
                "bid": round(mid - spread, 8),
                "ask": round(mid + spread, 8),
                "mid": round(mid, 8),
                "ts": _now(),
            }
        )
    return {
        "mode": "paper",
        "source": "synthetic-local",
        "markets": out,
        "live_quote_feed": False,
        "note": "Paper markets for MCP training. Not Jupiter/Meteora live APIs.",
    }


def refuse_live(*, mode: str = "paper", live: bool = False, explicit_live_flag: bool = False) -> dict[str, Any] | None:
    """
    LIVE is refused unless BOTH:
      - env JTX_LIVE=1
      - explicit tool flag (live=True or mode in LIVE/live)
    Default path always paper.
    """
    env_live = os.environ.get("JTX_LIVE", "").strip() == "1"
    wants_live = live or explicit_live_flag or str(mode).strip().upper() == "LIVE"
    if not wants_live:
        return None
    if not (env_live and wants_live):
        return {
            "ok": False,
            "error": "LIVE_REFUSED",
            "message": (
                "LIVE trading is disabled on this paper MCP. "
                "Default is dry-run/paper only. "
                "To enable LIVE you need JTX_LIVE=1 AND explicit live=true on the tool call "
                "(and a future real execution backend). This stub has no LIVE backend."
            ),
            "mode": "paper",
            "jtx_live_env": env_live,
            "requested_live": wants_live,
        }
    # Even if both set, this paper stub still has no chain executor
    return {
        "ok": False,
        "error": "LIVE_NOT_IMPLEMENTED",
        "message": (
            "JTX_LIVE=1 and live flag accepted for policy gate, "
            "but jtx-trade-paper MCP has no LIVE settlement path. "
            "Use paper tools only until jettoptx-jtx-trade MCP lands."
        ),
        "mode": "paper",
    }
