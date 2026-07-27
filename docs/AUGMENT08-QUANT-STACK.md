# Augment-08 Quant Stack — Architecture

**Product surface:** [wealth.astroknots.space](https://wealth.astroknots.space)  
**Org:** [github.com/jettoptx](https://github.com/jettoptx)  
**Plugin repo:** [jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth) (this repo)  
**Default money mode:** **dry-run / paper** — **no LIVE** unless a human explicitly says **LIVE**  
**Doc status:** architecture + integration map (no secrets)

---

## 1. Mission

Implement a closed-loop **paper quant stack** so JOE (Hermes Desktop, profile `astrojoe`) can:

1. Ingest **@jettoptx** X bookmarks → ranked **wealth signals**
2. Run **MiroShark** market simulations (Polymarket-style paper venues)
3. Train via **JTX Trade MCP** tools (paper balance / paper orders / PnL)
4. Keep **wealth.astroknots.space** as the **JTX-gated dry-run UX** (gate + intent display only)

This is **not** live trading infrastructure. LIVE settle remains hard-gated.

---

## 2. End-to-end pipeline

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  @jettoptx bookmarks (x-operator cron / --once)                          │
│  logs/x-bookmarks-latest-30.json                                         │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  wealth-bookmark-digest  (Hermes skill)                                  │
│  scripts/digest.py → ranked signals JSON + markdown                      │
│  tags: solana · x402 · jtx · hermes · agents · fintech · …               │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
┌─────────────────────────────┐     ┌─────────────────────────────────────┐
│  MiroShark (local)          │     │  weights7 / skill seeds (optional)  │
│  swarm + polymarket paper   │     │  regime labels → Wealth-08 skills   │
│  API :5001 · UI :3000       │     └─────────────────────────────────────┘
│  scenario seed → sim id     │
└──────────────┬──────────────┘
               │ market_prices · belief-drift · report
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  jtx-trade MCP (paper trainer)                                           │
│  jtx_health · jtx_markets_snapshot · jtx_paper_* · jtx_x402_catalog      │
│  Default: dry-run. LIVE requires JTX_LIVE=1 AND explicit tool flag       │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  wealth.astroknots.space                                                 │
│  · JTX ≥1 gate · X Money QR/link dry-run · last sim / paper session id   │
│  · No Privy · No LIVE settle in beta                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

**One-liner:**

```text
bookmarks → wealth-bookmark-digest → MiroShark sim → jtx MCP paper → wealth.astroknots.space
```

---

## 3. Repo & surface responsibilities

| Component | Visibility | Role in quant stack |
|-----------|------------|---------------------|
| **jettoptx-xwealth** (this repo) | public | Plugin, dry-run CLI, skills, **shared architecture docs**, future paper MCP host or pointer |
| **jettoptx-jtx-trade** | private | JTX Trade dapp (spot / Jupiter / Meteora / DePIN) — **MCP target** for paper training |
| **jettoptx-aaron-router** | private | x402 + edge router (optional path for metered agent commerce) |
| **jettoptx-aaron-public** | public | CF worker gateway |
| **jettoptx-aeon** | private | 24/7 autonomous ops spine (cron hooks, morning brief) |
| **jettoptx-docs** | public | Public docs site |
| **miroshark** (local clone) | local | Swarm market sims; primary **paper prediction-market** venue |
| **xwealth-ui** (`OPTX-windows/8-Wealth`) | local → host | Deployed as **wealth.astroknots.space** |

### Live rails (product hosts)

| URL | Role |
|-----|------|
| https://wealth.astroknots.space | JTX-gated dry-run UX + `/api/solana-rpc` proxy |
| https://jtx.astroknots.space | Agents / x402 catalog gateway |
| https://jtx.astroknots.space/agents | Agents storefront |
| https://jtx.astroknots.space/x402 | x402 service catalog (USDC Sol) |
| https://jtx.trade | Product front door (may 308) |

---

## 4. Paper vs LIVE boundary

| Mode | What is allowed | What is forbidden |
|------|-----------------|-------------------|
| **Paper / dry-run (default)** | Bookmark digest, MiroShark sims, paper MCP orders/fills logs, dry-run X Money intents, JTX gate checks | On-chain spend, LIVE settle, private keys in git/chat |
| **LIVE** | Only after human says **LIVE** + policy + matching local signer + settle path shipped | Casual enable via config alone |

**Hard gates (non-negotiable):**

1. Default money mode is **dry-run / paper**
2. LIVE requires **explicit human LIVE** and (for MCP) `JTX_LIVE=1` **and** an explicit tool flag — both default **off**
3. **No Privy** on wealth surfaces
4. **No secrets** in public docs or commits (no keypairs, no OAuth client secrets)
5. **No EFvg** wallet references for payTo/faucet; use **NEW_FAUCET** only
6. Fee treasury (docs-only here): Squads multisig vault — not a hot agent key; never commit private material

```text
Paper path:  signal → sim → paper order log → UI status
LIVE path:   human LIVE + JTX_LIVE=1 + tool flag + signer + settle  (not beta)
```

---

## 5. Stage detail

### 5.1 Bookmarks ingest

| Item | Value |
|------|--------|
| Operator | Hermes skill **x-operator** (`x_operator.py --once` / `--report`) |
| Identity | X OAuth as **@jettoptx** (session local; not in this repo) |
| Artifact | `…/hermes/profiles/astrojoe/logs/x-bookmarks-latest-30.json` |
| Cadence | Cron every 30–60m (Aeon / Hermes cron) |

Each bookmark object (typical shape):

```json
{
  "n": 1,
  "id": "…",
  "author": "@handle",
  "created": "ISO-8601",
  "text": "…",
  "urls": ["…"],
  "link": "https://x.com/i/status/…"
}
```

### 5.2 wealth-bookmark-digest

| Item | Value |
|------|--------|
| Skill path (Hermes) | `%HERMES_HOME%/custom-skills/wealth-bookmark-digest/` |
| Script | `scripts/digest.py` |
| Input | `x-bookmarks-latest-30.json` (or `--input` path) |
| Output | Ranked signals **JSON + markdown** for MiroShark seed refresh / Matrix brief |
| Tags | `solana`, `x402`, `jtx`, `hermes`, `agents`, `fintech`, `grok`, `graph`, … |
| Money | **None** — classification only |

See skill `SKILL.md` for run commands. Repo pointer: [§9](#9-repo-pointers-this-package).

### 5.3 MiroShark integration

| Item | Value |
|------|--------|
| Local clone | `…/repos/miroshark` |
| API | `http://127.0.0.1:5001` |
| UI | `http://127.0.0.1:3000` |
| Hermes skill | `miroshark-swarm-engine` |
| Scenario seed | `…/logs/miroshark-wealth08-scenario.md` |
| Platforms | `twitter`, `reddit`, `polymarket` |

**Flow:**

1. Digest ranked themes → refresh scenario briefing  
2. Smart Setup Bull / Base / Bear (or Just Ask)  
3. Run sim; poll `market_prices`, `belief-drift`, `volatility`  
4. Export `GET /api/report/<id>` into wealth digest / Matrix  
5. Optional MCP over sim graph for follow-up Q&A  

**Blockers (ops, not architecture):** OpenRouter (or compatible) key in MiroShark `.env`; Neo4j up; API not assumed always-on. Scaffold and skip live sim with a clear note when `:5001` is down.

**Example scenario title:**  
*Agent commerce on Solana: x402 + JTX Trade depth under a USDC retail wave*

### 5.4 JTX Trade paper MCP

Suggested tools (**all paper/dry-run by default**):

| Tool | Purpose |
|------|---------|
| `jtx_health` | Liveness / version / mode (`paper` \| blocked live) |
| `jtx_markets_snapshot` | Read-only markets / mid / depth summary |
| `jtx_paper_balance` | Simulated balances for training sessions |
| `jtx_paper_order` | Simulated fill log only (no chain send) |
| `jtx_paper_pnl` | Session and cumulative paper PnL |
| `jtx_x402_catalog` | Proxy GET `https://jtx.astroknots.space/x402` (public catalog) |

**Refuse LIVE** chain sends unless:

- env `JTX_LIVE=1`, **and**
- explicit per-call tool flag,

both default **off**.

**Shipped stub (this repo):** `mcp/jtx-trade-paper/` · FastMCP `server.py` + `cli.py` · skill `jtx-trade-mcp` · design `docs/PAPER-MCP.md` · deeplink notes `docs/AGENTS-DEEPLINK-PATCH.md`.  
Private `jettoptx-jtx-trade` clone may 401 — promote stub there when auth works.

### 5.5 wealth.astroknots.space (gate UI)

| Concern | Policy |
|---------|--------|
| Auth model | Solana wallet + **JTX ≥ 1** (mint documented in README) |
| X Money | Parse `/pay/` and `/transfer/` → dry-run intent only |
| Quant display | Optional: last MiroShark sim id, last paper session, digest headline |
| Privy | **Never** |
| LIVE | Hard-blocked until settle ships + human LIVE |

---

## 6. Aeon / 24×7 hooks (design)

Lightweight loop for `jettoptx-aeon` / Hermes cron (no destructive GH Actions without review):

```text
every 30–60m:
  1. x-operator --once          # refresh bookmarks JSON
  2. wealth-bookmark-digest     # ranked signals JSON+MD
  3. optional: miroshark /api/simulation/list health
  4. append headline to morning brief / Matrix #optx log
```

Nightly (optional):

```text
  · Grok Build Composer: feature/backtest report from paper logs
  · MiroShark scenario refresh from top digest themes
```

Morning brief inclusion path notes belong in **jettoptx-aeon** (private); this public doc only defines the **hook contract** (artifacts + cadence).

---

## 7. Security & compliance (public-safe)

| Rule | Detail |
|------|--------|
| No secrets | No private keys, OAuth secrets, or session tokens in git or this doc |
| No EFvg | Burned/retired wallet paths must not appear as payTo/faucet |
| NEW_FAUCET | x402 / demo payTo uses NEW_FAUCET only (public catalog) |
| Squads treasury | Fee sink is multisig — **docs-only** address in operator runbooks; not a hot key |
| Public vs private | Shared architecture lives here (public). Private dapp internals stay in private repos |
| Agent commerce | x402 catalog is readable; paying services is operator-opt-in and separate from paper training |

---

## 8. Capability map (bookmarks → stack)

Themes observed in latest @jettoptx bookmarks drive which stage consumes the signal:

| Theme | Downstream |
|-------|------------|
| **x402 / agent commerce** | MiroShark contracts; `jtx_x402_catalog`; wealth narrative |
| **JTX Trade product** | Paper MCP training focus; agents deeplink → wealth |
| **Solana payments / USDC / banks** | Regime labels; prediction-market questions |
| **Hermes / operator craft** | Cron hygiene; skill seeds |
| **Grok Build / Workspace** | Composer jobs for nightly reports |
| **Graph / KG** | Optional trade memory / MOA Wealth-08 graph runs |
| **Agent launchpads / on-chain agents** | JTX-gated agent identity patterns (paper) |
| **Fintech / agency OS** | Ops checklists — not live bank rails |
| Noise (politics, culture spam) | Dropped by digest ranker |

---

## 9. Repo pointers (this package)

| Path | Notes |
|------|--------|
| [README.md](../README.md) | Plugin overview, JTX gate, dry-run |
| [REPOS.md](../REPOS.md) | Clone map |
| [ROADMAP.md](../ROADMAP.md) | Beta → public host → LIVE policy |
| [skills/xwealth](../skills/xwealth) | In-repo xwealth skill |
| npm `digest:bookmarks` | Runs local pointer script → Hermes digest (see package.json) |
| Hermes skill (runtime) | `%HERMES_HOME%/custom-skills/wealth-bookmark-digest/` |

Install/run digest (Windows example):

```powershell
$env:HERMES_HOME = 'C:\Users\joshu\AppData\Local\hermes'
python "$env:HERMES_HOME\custom-skills\wealth-bookmark-digest\scripts\digest.py"
# writes ranked JSON + MD under profile logs (see skill SKILL.md)
```

Or from this repo after install:

```bash
npm run digest:bookmarks
```

---

## 10. Build order (aligned with org plan)

### P0

1. **Architecture doc** — this file  
2. **wealth-bookmark-digest** skill + verified `digest.py`  
3. **JTX Trade paper MCP** stub (health, snapshot, paper balance)  
4. **Agents → wealth** deeplink on jtx-trade / agents hub  
5. **Cron** x-operator + digest → log / Matrix  

### P1

6. Paper trade session object (no chain)  
7. MiroShark seed-from-bookmarks script + optional POST `/api/simulation/ask`  
8. Nightly Composer feature report  
9. Optional x402 pay for premium data tools  
10. Graph-run folder under OPTX-Cortex handovers for Wealth-08  

### P2

11. LIVE settle only after explicit policy  
12. Fee meter → Squads treasury  
13. Optional SpacetimeDB ledger  

---

## 11. Success criteria (stack-level)

- [x] `docs/AUGMENT08-QUANT-STACK.md` published in xwealth  
- [x] `wealth-bookmark-digest` runs on latest-30 JSON (skill outside repo)  
- [ ] jtx-trade paper MCP design or stub  
- [ ] MiroShark seed script + skill accuracy  
- [ ] Agents → wealth deeplink  
- [ ] Aeon/cron hook spec implemented lightly  

---

## 12. Related local artifacts (operator machine)

These paths are **local Hermes profile logs**, not shipped in git:

| Artifact | Purpose |
|----------|---------|
| `…/logs/x-bookmarks-latest-30.json` | Bookmark fuel |
| `…/logs/miroshark-wealth08-scenario.md` | MiroShark scenario seed |
| `…/logs/2026-07-27-augment08-quant-from-bookmarks.md` | Capability plan from bookmarks |
| `…/logs/GROK-BUILD-JETTOPTX-QUANT-IMPL.md` | Org implementation brief |

---

*Augment-08 / Wealth-08 — paper-first quant architecture for jettoptx-xwealth*  
*No secrets · No LIVE money · JTX-gated dry-run UX*
