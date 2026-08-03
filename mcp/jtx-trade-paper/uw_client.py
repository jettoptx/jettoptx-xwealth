"""Unusual Whales REST client for JTX Trade paper terminal (signals only).

Key sources (no secrets in git):
  - Dashboard / keys / usage: https://unusualwhales.com/dashboard/api
  - REST base: https://api.unusualwhales.com
  - Docs (Accept: text/plain): https://api.unusualwhales.com/docs
  - OpenAPI: https://api.unusualwhales.com/api/openapi
  - Official MCP: https://unusualwhales.com/public-api/mcp  (@unusualwhales/mcp)
  - Agent skill: https://unusualwhales.com/skill.md

Env (never commit values):
  UW_API_KEY or UNUSUAL_WHALES_API_KEY
  UW_CLIENT_API_ID (default 100001)
  UW_API_BASE (default https://api.unusualwhales.com)

LIVE trading is out of scope. All payloads are market-data signals for paper only.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

BASE = os.environ.get("UW_API_BASE", "https://api.unusualwhales.com").rstrip("/")
CLIENT_ID = os.environ.get("UW_CLIENT_API_ID", "100001")

DASHBOARD_URL = "https://unusualwhales.com/dashboard/api"
DOCS_URL = "https://api.unusualwhales.com/docs"
MCP_DOCS_URL = "https://unusualwhales.com/public-api/mcp"
SKILL_URL = "https://unusualwhales.com/skill.md"


def _api_key() -> str:
    return (
        os.environ.get("UW_API_KEY")
        or os.environ.get("UNUSUAL_WHALES_API_KEY")
        or ""
    ).strip()


def configured() -> bool:
    return bool(_api_key())


def _trim_list(data: Any, limit: int) -> Any:
    if isinstance(data, list):
        return data[: max(0, int(limit))]
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        out = dict(data)
        out["data"] = data["data"][: max(0, int(limit))]
        return out
    return data


def _count_rows(payload: dict[str, Any]) -> int:
    d = payload.get("data")
    if isinstance(d, dict) and isinstance(d.get("data"), list):
        return len(d["data"])
    if isinstance(d, list):
        return len(d)
    return 0


def get(path: str, params: dict[str, Any] | None = None, timeout: float = 30.0) -> dict[str, Any]:
    """GET path (must start with /api/). Returns {ok, ...} without secrets."""
    key = _api_key()
    if not key:
        return {
            "ok": False,
            "error": "missing_api_key",
            "message": "Set UW_API_KEY or UNUSUAL_WHALES_API_KEY in env (never commit).",
            "mode": "paper_signal",
            "dashboard": DASHBOARD_URL,
        }
    if not path.startswith("/"):
        path = "/" + path
    q = ""
    if params:
        clean = {k: v for k, v in params.items() if v is not None and v != ""}
        if clean:
            q = "?" + urllib.parse.urlencode(clean, doseq=True)
    url = f"{BASE}{path}{q}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "UW-CLIENT-API-ID": str(CLIENT_ID),
            "User-Agent": "jtx-trade-paper/0.3",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            status = getattr(resp, "status", 200)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {"raw": body[:8000]}
        return {
            "ok": True,
            "mode": "paper_signal",
            "source": "unusualwhales",
            "path": path,
            "http_status": status,
            "data": data,
            "note": "Market data only — not a trade signal to auto-execute. JTX paper/LIVE separate.",
        }
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8", errors="replace")[:500]
        except Exception:
            pass
        return {
            "ok": False,
            "error": "http_error",
            "path": path,
            "http_status": e.code,
            "message": str(e.reason if hasattr(e, "reason") else e),
            "body_preview": err_body,
            "dashboard": DASHBOARD_URL,
        }
    except Exception as e:  # noqa: BLE001
        return {
            "ok": False,
            "error": "fetch_failed",
            "path": path,
            "message": str(e),
            "dashboard": DASHBOARD_URL,
        }


def market_tide() -> dict[str, Any]:
    return get("/api/market/market-tide")


def total_options_volume() -> dict[str, Any]:
    return get("/api/market/total-options-volume")


def flow_alerts(limit: int = 20, ticker_symbol: str | None = None) -> dict[str, Any]:
    params: dict[str, Any] = {"limit": int(limit)}
    if ticker_symbol:
        params["ticker_symbol"] = str(ticker_symbol).upper()
    return get("/api/option-trades/flow-alerts", params)


def darkpool_recent(limit: int = 20) -> dict[str, Any]:
    return get("/api/darkpool/recent", {"limit": int(limit)})


def darkpool_ticker(ticker: str, limit: int = 20) -> dict[str, Any]:
    t = (ticker or "").strip().upper()
    if not t:
        return {"ok": False, "error": "ticker_required"}
    return get(f"/api/darkpool/{urllib.parse.quote(t)}", {"limit": int(limit)})


def ticker_flow(ticker: str) -> dict[str, Any]:
    t = (ticker or "").strip().upper()
    if not t:
        return {"ok": False, "error": "ticker_required"}
    return get(f"/api/stock/{urllib.parse.quote(t)}/flow-recent")


def net_prem_ticks(ticker: str) -> dict[str, Any]:
    t = (ticker or "").strip().upper()
    if not t:
        return {"ok": False, "error": "ticker_required"}
    return get(f"/api/stock/{urllib.parse.quote(t)}/net-prem-ticks")


def options_volume(ticker: str) -> dict[str, Any]:
    t = (ticker or "").strip().upper()
    if not t:
        return {"ok": False, "error": "ticker_required"}
    return get(f"/api/stock/{urllib.parse.quote(t)}/options-volume")


def news_headlines(limit: int = 10) -> dict[str, Any]:
    return get("/api/news/headlines", {"limit": int(limit)})


def screener_stocks(limit: int = 10) -> dict[str, Any]:
    return get("/api/screener/stocks", {"limit": int(limit)})


def screener_option_contracts(limit: int = 10, min_premium: int | None = None) -> dict[str, Any]:
    params: dict[str, Any] = {"limit": int(limit)}
    if min_premium is not None:
        params["min_premium"] = int(min_premium)
    return get("/api/screener/option-contracts", params)


def paper_terminal(
    ticker: str = "SPY",
    flow_limit: int = 5,
    darkpool_limit: int = 5,
    news_limit: int = 5,
    screener_limit: int = 5,
) -> dict[str, Any]:
    """Composite paper-terminal board from UW REST (signals only).

    Dashboard for keys/usage: https://unusualwhales.com/dashboard/api
    Full tool surface also available via official MCP (@unusualwhales/mcp, 27 tools).
    """
    t = (ticker or "SPY").strip().upper() or "SPY"
    fl = max(1, min(int(flow_limit), 25))
    dl = max(1, min(int(darkpool_limit), 25))
    nl = max(1, min(int(news_limit), 20))
    sl = max(1, min(int(screener_limit), 20))

    started = time.time()
    sections: dict[str, Any] = {}

    tide = market_tide()
    if tide.get("ok") and isinstance(tide.get("data"), dict):
        raw = tide["data"].get("data")
        if isinstance(raw, list) and raw:
            sections["market_tide"] = {
                "ok": True,
                "points": len(raw),
                "latest": raw[-1],
                "path": tide.get("path"),
            }
        else:
            sections["market_tide"] = {"ok": True, "points": 0, "data": tide.get("data")}
    else:
        sections["market_tide"] = {"ok": False, "error": tide.get("error"), "http_status": tide.get("http_status")}

    vol = total_options_volume()
    sections["total_options_volume"] = {
        "ok": bool(vol.get("ok")),
        "data": vol.get("data") if vol.get("ok") else None,
        "error": vol.get("error"),
        "http_status": vol.get("http_status"),
    }

    alerts = flow_alerts(limit=fl, ticker_symbol=t)
    a_data = alerts.get("data")
    if alerts.get("ok") and isinstance(a_data, dict):
        rows = a_data.get("data") if isinstance(a_data.get("data"), list) else []
        sections["flow_alerts"] = {"ok": True, "ticker": t, "count": len(rows), "rows": rows}
    else:
        sections["flow_alerts"] = {
            "ok": False,
            "ticker": t,
            "error": alerts.get("error"),
            "http_status": alerts.get("http_status"),
        }

    dp = darkpool_ticker(t, limit=dl)
    d_data = dp.get("data")
    if dp.get("ok") and isinstance(d_data, dict):
        rows = d_data.get("data") if isinstance(d_data.get("data"), list) else []
        sections["darkpool_ticker"] = {"ok": True, "ticker": t, "count": len(rows), "rows": rows}
    elif dp.get("ok"):
        sections["darkpool_ticker"] = {"ok": True, "ticker": t, "data": _trim_list(d_data, dl)}
    else:
        sections["darkpool_ticker"] = {
            "ok": False,
            "ticker": t,
            "error": dp.get("error"),
            "http_status": dp.get("http_status"),
        }

    tf = ticker_flow(t)
    tf_data = tf.get("data")
    if tf.get("ok") and isinstance(tf_data, dict):
        rows = tf_data.get("data") if isinstance(tf_data.get("data"), list) else []
        sections["ticker_flow"] = {"ok": True, "ticker": t, "count": len(rows), "rows": rows[:fl]}
    else:
        sections["ticker_flow"] = {
            "ok": bool(tf.get("ok")),
            "ticker": t,
            "error": tf.get("error"),
            "http_status": tf.get("http_status"),
            "count": _count_rows(tf) if tf.get("ok") else 0,
        }

    ov = options_volume(t)
    sections["options_volume"] = {
        "ok": bool(ov.get("ok")),
        "ticker": t,
        "data": ov.get("data") if ov.get("ok") else None,
        "error": ov.get("error"),
        "http_status": ov.get("http_status"),
    }

    # Net prem ticks can be large — keep last N only
    npt = net_prem_ticks(t)
    npt_data = npt.get("data")
    if npt.get("ok") and isinstance(npt_data, dict):
        rows = npt_data.get("data") if isinstance(npt_data.get("data"), list) else []
        sections["net_prem_ticks"] = {
            "ok": True,
            "ticker": t,
            "count_total": len(rows),
            "latest": rows[-min(fl, len(rows)) :] if rows else [],
        }
    else:
        sections["net_prem_ticks"] = {
            "ok": False,
            "ticker": t,
            "error": npt.get("error"),
            "http_status": npt.get("http_status"),
        }

    news = news_headlines(limit=nl)
    n_data = news.get("data")
    if news.get("ok") and isinstance(n_data, dict):
        rows = n_data.get("data") if isinstance(n_data.get("data"), list) else []
        sections["news"] = {"ok": True, "count": len(rows), "rows": rows}
    else:
        sections["news"] = {
            "ok": bool(news.get("ok")),
            "error": news.get("error"),
            "http_status": news.get("http_status"),
        }

    sc_opt = screener_option_contracts(limit=sl)
    so_data = sc_opt.get("data")
    if sc_opt.get("ok") and isinstance(so_data, dict):
        rows = so_data.get("data") if isinstance(so_data.get("data"), list) else []
        sections["screener_option_contracts"] = {"ok": True, "count": len(rows), "rows": rows}
    else:
        sections["screener_option_contracts"] = {
            "ok": bool(sc_opt.get("ok")),
            "error": sc_opt.get("error"),
            "http_status": sc_opt.get("http_status"),
        }

    sc_stk = screener_stocks(limit=sl)
    ss_data = sc_stk.get("data")
    if sc_stk.get("ok") and isinstance(ss_data, dict):
        rows = ss_data.get("data") if isinstance(ss_data.get("data"), list) else []
        sections["screener_stocks"] = {"ok": True, "count": len(rows), "rows": rows}
    else:
        sections["screener_stocks"] = {
            "ok": bool(sc_stk.get("ok")),
            "error": sc_stk.get("error"),
            "http_status": sc_stk.get("http_status"),
        }

    ok_bits = [bool(v.get("ok")) for v in sections.values() if isinstance(v, dict)]
    ok = any(ok_bits) and configured()
    elapsed_ms = int((time.time() - started) * 1000)

    return {
        "ok": ok,
        "mode": "paper_terminal",
        "source": "unusualwhales",
        "ticker": t,
        "configured": configured(),
        "elapsed_ms": elapsed_ms,
        "rails": {
            "dashboard_api": DASHBOARD_URL,
            "rest_base": BASE,
            "docs": DOCS_URL,
            "mcp_docs": MCP_DOCS_URL,
            "skill": SKILL_URL,
            "official_mcp": "@unusualwhales/mcp (stdio; hermes mcp_servers.unusualwhales)",
        },
        "policy": {
            "paper_default": True,
            "auto_execute": False,
            "live": "refused_on_this_mcp",
            "note": "UW feeds signals into jtx paper tools; never auto-LIVE.",
        },
        "board": sections,
        "companion_tools": {
            "jtx_paper_order": "Simulate fills on local ledger after human/agent decision",
            "jtx_paper_balance": "Paper book",
            "jtx_paper_pnl": "Paper MTM",
            "hermes_unusualwhales_mcp": "Full 27-tool UW surface (uw_flow, uw_darkpool, ...)",
        },
    }
