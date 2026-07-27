#!/usr/bin/env python3
"""Smoke test for jtx-trade-paper (no MCP transport; direct module calls)."""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

# Isolate ledger
tmp = tempfile.mkdtemp(prefix="jtx-paper-")
os.environ["JTX_PAPER_DATA_DIR"] = tmp
# Ensure clean LIVE env
os.environ.pop("JTX_LIVE", None)

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import paper_state as ps  # noqa: E402
import server  # noqa: E402


def pp(label: str, raw: str | dict) -> dict:
    data = json.loads(raw) if isinstance(raw, str) else raw
    print(f"\n=== {label} ===")
    print(json.dumps(data, indent=2)[:2000])
    return data


def main() -> int:
    h = pp("health", server.jtx_health())
    assert h["ok"] is True
    assert h["mode_default"] == "paper"

    m = pp("markets", server.jtx_markets_snapshot())
    assert m["mode"] == "paper"
    assert len(m["markets"]) >= 3

    b = pp("balance", server.jtx_paper_balance())
    assert b["ok"] is True
    assert b["balances"]["USDC"] == 10000.0

    # LIVE must refuse
    live = pp(
        "live_refused",
        server.jtx_paper_order(side="buy", symbol="SOL/USDC", size=0.1, mode="LIVE", live=True),
    )
    assert live.get("ok") is False
    assert live.get("error") in ("LIVE_REFUSED", "LIVE_NOT_IMPLEMENTED")

    o = pp(
        "paper_order",
        server.jtx_paper_order(side="buy", symbol="SOL/USDC", size=1.0, mode="paper"),
    )
    assert o["ok"] is True
    assert o["fill"]["simulated"] is True

    pnl = pp("pnl", server.jtx_paper_pnl())
    assert pnl["ok"] is True
    assert "pnl_usd" in pnl

    cat = pp("x402", server.jtx_x402_catalog())
    assert cat.get("ok") is True, cat
    assert "catalog" in cat
    services = cat["catalog"].get("services") if isinstance(cat["catalog"], dict) else None
    assert services, "expected services in x402 catalog"

    print("\nSMOKE_OK", tmp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
