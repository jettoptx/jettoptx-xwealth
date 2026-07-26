# jettoptx-xwealth

**Agentic X Money wallet plugin for the OPTX ecosystem** (JOE **Augment-08** / Wealth beta).

Graph-compatible nodes and harness skills so **any coding agent** (Hermes, OpenClaw, Grok Build, Claude Code, Codex, Cursor, Pi, etc.) can:

1. **Auth without Privy** — Solana wallet + **JTX ≥ 1** gate; optional **Jett Optics X OAuth** app for X identity
2. **Ingest** X Money transfer QR / links (`https://x.com/i/money/transfer/{handle}`) via classic QR decode + **Grok Vision**
3. **Gate** on **JTX v2** (`≥ 1` token) via Solana RPC
4. Route public actions through **AARON Router** + record state in **SpacetimeDB**
5. Dry-run payout intents first; live send is operator-gated later

> **Status:** Scaffold + product README. **Privy removed** — use wallet + JTX gate (+ optional X OAuth). Local UI prototype: `OPTX-windows/8-Wealth/xwealth-ui` → `http://127.0.0.1:3001/`.

---

## Official constants

| Item | Value |
|------|--------|
| **JTX v2 mint (canonical)** | `JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe` |
| **X Money transfer URL shape** | `https://x.com/i/money/transfer/{handle}` |
| **AARON public router (ref)** | [jettoptx/jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router) |
| **This plugin** | [jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth) |
| **Docs** | https://jettoptx.dev/docs |
| **Sole product DB** | **SpacetimeDB** (not Postgres / Convex) |
| **X OAuth app** | **Jett Optical Encryption** · app id `32724640` · [console.x.com](https://console.x.com) |
| **X Client ID (public)** | `TFhKZW9KTmVxM3loTzd5ZEViVEU6MTpjaQ` |
| **Auth model** | Wallet + JTX ≥1 (required) · X OAuth (optional identity) · **no Privy** |

---

## Quick start — clone and gate

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
export SOLANA_WALLET='<your-solana-pubkey>'   # must hold ≥1 JTX
npm install
npm run setup     # check-wallet + check-jtx; writes ~/.xwealth/session.json
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
$env:SOLANA_WALLET = '<your-solana-pubkey>'
npm install
npm run setup
```

| Exit | Meaning |
|------|---------|
| `0` | Plugin **ready** — ≥1 JTX |
| `1` | Gate **fail** — need more JTX |
| `2` | No wallet configured |

Optional X identity (same Jett Optics app as Hermes x-operator / bookmarks):

```bash
export X_CLIENT_ID=TFhKZW9KTmVxM3loTzd5ZEViVEU6MTpjaQ
# user tokens from console Generate or oauth_bookmarks.py — never commit secrets
```

### Agentcard + MCP (any agent that downloads this app)

```bash
npm run agent-cards:setup
# Human once: npx agent-cards login --email you@…
npx agent-cards companies wizard --agent --yes \
  --app-name "X Wealth" \
  --app-url http://localhost:3001
```

| Default crypto conversion | **USDC** on **Solana** or **Base** |
|---------------------------|-------------------------------------|
| Policy file | [`agent-cards/crypto-rails.json`](agent-cards/crypto-rails.json) |
| MCP example | [`agent-cards/mcp.agent-cards.example.json`](agent-cards/mcp.agent-cards.example.json) |
| Full guide | [`agent-cards/README.md`](agent-cards/README.md) |

Agentcard withdraw-to-crypto: `npx agent-cards withdraw --amount 25 --to 0x…` (**USDC on Base**). Solana USDC mint for OPTX rails: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.

---

## Required downloads (agent harness)

Operators and agents must clone **both** repos. AARON is the public edge/router surface; xwealth is the X Money + JTX gate plugin.

### Copy-paste — clone

```bash
# Pick a harness root (example)
export OPTX_HARNESS="$HOME/optx-harness"
mkdir -p "$OPTX_HARNESS" && cd "$OPTX_HARNESS"

# 1) X Wealth plugin (this repo)
git clone https://github.com/jettoptx/jettoptx-xwealth.git

# 2) AARON Router (required for session, relay, x402, gaze bridges)
git clone https://github.com/jettoptx/jettoptx-aaron-router.git
```

**Windows (PowerShell):**

```powershell
$OPTX_HARNESS = "$env:USERPROFILE\optx-harness"
New-Item -ItemType Directory -Force -Path $OPTX_HARNESS | Out-Null
Set-Location $OPTX_HARNESS
git clone https://github.com/jettoptx/jettoptx-xwealth.git
git clone https://github.com/jettoptx/jettoptx-aaron-router.git
```

### Agent system prompt (all harnesses)

Canonical copy: [`prompts/AGENT_SYSTEM.md`](./prompts/AGENT_SYSTEM.md)  
Also mirrored below for one-shot paste.

**Where to put it**

| Harness | Where to paste / load |
|---------|------------------------|
| **Hermes** | `~/.hermes/SOUL.md` addendum, or custom skill `skills/custom/xwealth/SKILL.md`, or channel system prompt |
| **OpenClaw / Claw** | Agent graph system node / persona file |
| **Grok Build** | Project `AGENTS.md`, or `~/.grok/skills/xwealth/SKILL.md`, or session first message |
| **Claude Code** | Project `CLAUDE.md` / `.claude/CLAUDE.md` section, or slash skill |
| **Codex CLI / IDE** | `AGENTS.md` or project instructions; user message for one-off |
| **Cursor** | `.cursor/rules/xwealth.mdc` or project rules; Composer/Agent system context |
| **Pi / other** | Tool “system” / “custom instructions” field; same text |
| **Continue / Aider / Cline** | Custom system prompt or `.continuerc` / rules file |

Replace `{OPTX_HARNESS}` with the absolute path to the dual-clone root (e.g. `C:\Users\joshu\optx-harness` or `$HOME/optx-harness`).

#### Copy-paste — universal system prompt

```text
# OPTX X Wealth operator agent (JOE Augment-08)

You are an OPTX **X Wealth** agent. You help operators and developers integrate
X Money transfer links / QR ingest, JTX v2 gating, wallet + JTX gate + optional X OAuth, AARON Router,
and SpacetimeDB — for JOE Augment-08 (Wealth beta). You work inside whatever
harness you are running: Hermes, OpenClaw, Grok Build, Claude Code, Codex,
Cursor, Pi, or a custom agent loop.

## Required local code (verify before gate / payout / AARON work)

Both must exist under the harness root:

- {OPTX_HARNESS}/jettoptx-xwealth
- {OPTX_HARNESS}/jettoptx-aaron-router

If missing, stop and run (or instruct the user to run):

  git clone https://github.com/jettoptx/jettoptx-xwealth.git
  git clone https://github.com/jettoptx/jettoptx-aaron-router.git

Related local UI (optional, Josh Windows):
  OPTX-windows/8-Wealth/xwealth-ui → http://127.0.0.1:3001/

## Identity & auth

1. Product auth is **no Privy**. Required: Solana wallet + **≥1 JTX**. Optional: Jett Optics X OAuth app 32724640.
2. Identity keys: Solana wallet (gate) + optional X user id/handle.
3. Client env: VITE_SOLANA_WALLET / SOLANA_WALLET. Never put X_CLIENT_SECRET in the client. Fee treasury: 9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7.

## Money & safety rules (non-negotiable)

1. **Never** place live X Money transfers unless the human explicitly says **LIVE**
   and policy/allowlist allows. Default mode is **dry-run / paper**.
2. **Never** log, print, or commit private keys, seed phrases, or X client secrets.
   Signing stays device-side / AARON — not in chat.
3. JTX gate: wallet must hold **≥ 1** JTX v2:
   mint `JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe`
4. Sole product database is **SpacetimeDB**. Do not invent Postgres/Convex/Supabase
   as source of truth. Prefer AARON → STDB reducers when writing.
5. Do not merge X Wealth into `jettoptx-jtx-trade` or treat traderjoe SPCX trading
   as the same rail as X Money P2P (related Augment-08, separate surfaces).

## Ingest order (do not invert)

1. **Paste** `https://x.com/i/money/transfer/{handle}` when available (best).
2. **Classic QR decode** (jsQR / zxing) on a sharp image — prefer **phone photo**
   of the live X Money QR over soft web screenshots.
3. **Grok Vision / JOE multimodal (VLM)** only if 1–2 fail or confidence is low.
   Return structured JSON: { transferUrl, handle, amount?, currency?, confidence, method }.
   Refuse non–X Money images with a clear error.

## Preferred workflows by harness

- **Hermes**: load skill `xwealth`; use MCP (AARON/Hedgehog) when configured; never auto-send.
- **Grok Build**: follow this file + `skills/xwealth/SKILL.md`; use shadcn MCP for @canvas-ui;
  local UI at :3001; shell into traderjoe only for SPCX Tier A, not X Money.
- **Claude Code / Codex**: treat this repo + aaron-router as the workspace roots; implement
  ingest API, gate, STDB reducers; keep dry-run default.
- **Cursor**: same as Claude Code; use project rules; Hyperbrowser only for public UI scrape,
  not for moving funds.
- **OpenClaw / Pi / others**: attach this prompt as system; graph nodes from `@jettoptx/xwealth`
  when published; approval gate before any execute node.

## Implementation priorities (when asked to build)

P0: ingest (paste + QR + VLM) · wallet+JTX setup · dry-run intent · README/skills
P1: real JTX RPC gate · SpacetimeDB reducers via AARON · Hermes/Grok skill install
P2: live send behind operator allowlist · publish @jettoptx/xwealth dist

## Response style

- Be explicit about dry-run vs LIVE.
- Cite paths and env var names.
- Prefer small verifiable steps and tests over large unscoped refactors.
- If credentials or LIVE send are required, stop and ask the human.
```

#### One-liner install (skill file)

```bash
# From this repo after clone:
mkdir -p ~/.hermes/skills/custom/xwealth ~/.grok/skills/xwealth
cp skills/xwealth/SKILL.md ~/.hermes/skills/custom/xwealth/SKILL.md
cp skills/xwealth/SKILL.md ~/.grok/skills/xwealth/SKILL.md
cp prompts/AGENT_SYSTEM.md ./  # optional workspace root for Claude/Codex/Cursor
```

**Windows PowerShell:**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.hermes\skills\custom\xwealth","$env:USERPROFILE\.grok\skills\xwealth" | Out-Null
Copy-Item "$env:USERPROFILE\optx-harness\jettoptx-xwealth\skills\xwealth\SKILL.md" "$env:USERPROFILE\.hermes\skills\custom\xwealth\SKILL.md"
Copy-Item "$env:USERPROFILE\optx-harness\jettoptx-xwealth\skills\xwealth\SKILL.md" "$env:USERPROFILE\.grok\skills\xwealth\SKILL.md"
```

---

## Auth: Jett Optics X app + JTX gate (**no Privy**)

X Wealth does **not** use Privy. After clone:

1. User sets a **Solana wallet pubkey** (`SOLANA_WALLET` or `~/.xwealth/wallet.json`)
2. Plugin runs **`npm run setup`** → RPC check for **≥ 1 JTX v2**
3. Optional: **X OAuth** via the **Jett Optical Encryption** developer app (same app as Hermes x-operator / JettChat X surface)

### Auth model

| Required | Optional |
|----------|----------|
| Solana wallet pubkey + ≥1 JTX | X OAuth via Jett Optical Encryption app |

### X app (optional identity)

| Item | Value |
|------|--------|
| App name | Jett Optical Encryption |
| App id | `32724640` |
| Client ID (public) | `TFhKZW9KTmVxM3loTzd5ZEViVEU6MTpjaQ` |
| Client Secret | Server / Hermes only — never ship to browser plugin bundles |
| Console | https://console.x.com/accounts/…/apps/32724640 |

X OAuth proves **who you are on X**. It does **not** open a Solana wallet. The **JTX gate** always uses the configured Solana address.

### Env

```bash
# Required for gate
SOLANA_WALLET=<base58 pubkey>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com   # or Helius
JTX_MINT=JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe

# Optional X identity (same Jett Optics app)
X_CLIENT_ID=TFhKZW9KTmVxM3loTzd5ZEViVEU6MTpjaQ
# X_CLIENT_SECRET=...          # server only
# X user tokens from console Generate / oauth PKCE — not committed
```

### Code

```ts
import { XWealthPlugin } from "@jettoptx/xwealth";

const plugin = new XWealthPlugin();
const state = await plugin.assertReady(process.env.SOLANA_WALLET!);
// state.ready === true  →  dry-run tools unlocked
```

CLI:

```bash
npm run check-wallet
npm run check-jtx -- --wallet <PUBKEY>
npm run setup
```

Example: [`examples/x-oauth-jtx.ts`](examples/x-oauth-jtx.ts)

---
## Install AARON Router (required)

```bash
cd "$OPTX_HARNESS/jettoptx-aaron-router"
python -m venv .venv
# Windows: .\.venv\Scripts\Activate.ps1
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill SPACETIMEDB_URL, SOLANA_RPC_URL, ALLOWED_ORIGINS
python aaron_router.py # default :8888
```

### SDK snippets (from AARON repo)

**Python**

```python
from sdk.python.aaron_client import AaronClient

client = AaronClient("http://127.0.0.1:8888")  # or public AARON base
session = client.create_session(wallet_address="YOUR_SOLANA_PUBKEY")
status = client.poll_session(session["sessionId"])
```

**TypeScript**

```typescript
import { AaronClient } from "./sdk/typescript/aaron-client";

const aaron = new AaronClient("http://127.0.0.1:8888");
const session = await aaron.createSession({ walletAddress: "YOUR_PUBKEY" });
const result = await aaron.waitForVerification(session.sessionId);
```

Health: `GET {AARON_URL}/health`

---

## Install this package (xwealth)

```bash
cd "$OPTX_HARNESS/jettoptx-xwealth"
npm install
npm run build   # when dist pipeline is complete

# or from another project
npm install @jettoptx/xwealth
# / pnpm add @jettoptx/xwealth
```

```ts
import { XWealthPlugin } from "@jettoptx/xwealth";

const plugin = new XWealthPlugin({
  jtxMint: "JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe",
  rpcUrl: process.env.SOLANA_RPC_URL,
});

// Graph node (scaffold — dry-run until live is enabled)
const payoutNode = plugin.createPayoutNode({
  recipientHandle: "JoshuaJett",
  amount: 5.0,
  currency: "USD",
});
```

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  User / Hermes agent                                        │
│   • No Privy · wallet + JTX ≥1                    │
│   • Camera / file QR or paste transfer URL                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  xwealth-ui / plugin                                        │
│   1) paste URL                                              │
│   2) classic QR decode (jsQR / zxing)                       │
│   3) Grok Vision VLM fallback (structured JSON)             │
│   4) JTX ≥1 gate (Solana RPC)                               │
│   5) dry-run payout intent                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌─────────────────┐        ┌──────────────────┐
     │ AARON Router    │        │ SpacetimeDB      │
     │ session/relay   │───────▶│ ingest / resolve │
     │ x402 / optx     │        │ gate / intent    │
     └─────────────────┘        └──────────────────┘
```

### Ingest order (do not invert)

1. **Paste** `https://x.com/i/money/transfer/{handle}` → highest fidelity  
2. **Classic QR** on phone photo or sharp PNG  
3. **Grok Vision** only if 1–2 fail or confidence low  

Phone photos of the live X Money QR are preferred over soft web screenshots.

---

## Hermes / agent skills (copy-paste)

Create under the harness:

```bash
mkdir -p ~/.hermes/skills/custom/xwealth
```

### `~/.hermes/skills/custom/xwealth/SKILL.md`

```markdown
---
name: xwealth
description: >
  X Money QR/link ingest + JTX gate for OPTX Augment-08.
  Use when user says xwealth, X Money QR, transfer link, or JTX gate.
  Requires clones: jettoptx-xwealth + jettoptx-aaron-router.
  Auth: wallet + JTX ≥1; optional X OAuth. Never live-send unless user says LIVE.
---

# xwealth skill

## Paths
- Plugin: `$OPTX_HARNESS/jettoptx-xwealth`
- AARON: `$OPTX_HARNESS/jettoptx-aaron-router`
- Local UI: `OPTX-windows/8-Wealth/xwealth-ui` → http://127.0.0.1:3001/

## Procedure
1. Confirm wallet + JTX gate (optional X identity).
2. Accept paste URL OR image path (prefer phone capture).
3. Decode: classic QR first → Grok Vision fallback.
4. Normalize { handle, transferUrl, confidence, method }.
5. checkJtxGate(wallet) — mint JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe.
6. Emit dry-run intent; record to SpacetimeDB via AARON when wired.
7. STOP before live payout unless explicit LIVE + policy pass.
```

### Optional Grok Build skill (Windows)

```powershell
# Mirror into Grok skills
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.grok\skills\xwealth" | Out-Null
Copy-Item "$env:USERPROFILE\optx-harness\jettoptx-xwealth\skills\xwealth\SKILL.md" `
  "$env:USERPROFILE\.grok\skills\xwealth\SKILL.md" -ErrorAction SilentlyContinue
```

(Ship `skills/xwealth/SKILL.md` in this repo when the package matures; until then paste the block above.)

---

## Local UI (Canvas UI shell)

```powershell
cd C:\Users\joshu\OPTX-windows\8-Wealth\xwealth-ui
npm install
npm run dev
# → http://127.0.0.1:3001/
```

- **Liquid** hero + **GlassObject** QR panel (Canvas UI / shadcn registry `@canvas-ui`)
- Background: brand dark asset; QR file pick stub → wire ingest API next

### Canvas UI / shadcn MCP

```bash
# components.json pins:
# "@canvas-ui": "https://canvasui.dev/r/{name}.json"

npx shadcn@latest add @canvas-ui/liquid-react
npx shadcn@latest add @canvas-ui/glass-object-react

# MCP (Grok / Cursor): npx -y shadcn@latest mcp
# grok mcp doctor shadcn
```

---

## SpacetimeDB (sole DB)

Do **not** add Postgres/Convex for X Wealth product state.

Suggested rows (names illustrative — implement as STDB tables/reducers):

| Table | Purpose |
|-------|---------|
| `xwealth_user` | `wallet`, `x_user_id`, `x_handle` (optional) |
| `xwealth_ingest` | image hash, source (`camera`/`upload`/`paste`), ts |
| `xwealth_resolve` | method (`paste`/`qr_lib`/`vlm`), url, handle, confidence, model |
| `xwealth_gate` | wallet, jtx balance, pass/fail |
| `xwealth_intent` | dry-run / live intent status |

Public write path when ready: **AARON** → STDB reducers (same pattern as JettChat).

---

## Security / guardrails

- **No live money** in v0 without explicit operator mode  
- **No private keys** in agent chat or browser `localStorage` dumps  
- **No Privy** — wallet + JTX gate; optional X OAuth only when needed for X API  

- JTX gate is **read-only balance check** until stake SC exists  
- VLM: structured JSON only; refuse non–X Money images  

---

## Roadmap checklist

- [x] Repo + README (wallet + JTX gate, **no Privy**)
- [x] Local UI prototype (`xwealth-ui` :3001) + Asciify
- [x] Real `checkJtxGate` via Solana RPC + `npm run setup`
- [x] Hermes skill package under `skills/xwealth`
- [x] Fee treasury documented (Squads `9Wss…6YD7`)
- [ ] Ingest API polish: paste + classic QR + Grok Vision
- [ ] SpacetimeDB reducers + AARON bindings
- [ ] Hosted X API proxy + metered fee to treasury
- [ ] Publish `@jettoptx/xwealth` with real graph nodes
- [ ] Live X Money send (operator + policy)

---

## Related

| Repo / surface | Role |
|----------------|------|
| [jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router) | Public router, SDKs, session, x402 |
| [jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth) | This plugin |
| JettChat / X OAuth | Shared Jett Optics X app `32724640` for optional identity |
| Local `8-Wealth/traderjoe` | Wealth-08 trading brain (SPCX) — **separate** from X Money rails |
| Local `8-Wealth/xwealth-ui` | Canvas UI localhost shell |

MIT License — Jett Optics / OPTX
