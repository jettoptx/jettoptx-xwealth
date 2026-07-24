# jettoptx-xwealth

**Agentic X Money wallet plugin for the OPTX ecosystem** (JOE **Augment-08** / Wealth beta).

Graph-compatible nodes and harness skills so **any coding agent** (Hermes, OpenClaw, Grok Build, Claude Code, Codex, Cursor, Pi, etc.) can:

1. **Sign in** via a **Jett Optics–style Privy app forced to X (Twitter) OAuth only**
2. **Ingest** X Money transfer QR / links (`https://x.com/i/money/transfer/{handle}`) via classic QR decode + **Grok Vision**
3. **Gate** on **JTX v2** (`≥ 1` token)
4. Route public actions through **AARON Router** + record state in **SpacetimeDB**
5. Dry-run payout intents first; live send is operator-gated later

> **Status:** Scaffold + product README. Package API is still in progress. Local UI prototype: `OPTX-windows/8-Wealth/xwealth-ui` → `http://127.0.0.1:5180/`.

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
X Money transfer links / QR ingest, JTX v2 gating, Privy X-only auth, AARON Router,
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
  OPTX-windows/8-Wealth/xwealth-ui → http://127.0.0.1:5180/

## Identity & auth

1. Product auth is **Privy** (Jett Optics / JettChat app family) with
   **loginMethods: ["twitter"] ONLY** — no email, Google, SMS, or wallet-only login
   on the X Wealth surface.
2. Identity keys: **X user id / handle** primary; store **Privy DID** + Solana
   embedded wallet address for gates and records.
3. Client env for Vite UI: VITE_PRIVY_APP_ID. Never commit Privy App Secret to the client.

## Money & safety rules (non-negotiable)

1. **Never** place live X Money transfers unless the human explicitly says **LIVE**
   and policy/allowlist allows. Default mode is **dry-run / paper**.
2. **Never** log, print, or commit private keys, seed phrases, or Privy app secrets.
   Signing stays device-side / embedded Privy confirmation / AARON — not in chat.
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
  local UI at :5180; shell into traderjoe only for SPCX Tier A, not X Money.
- **Claude Code / Codex**: treat this repo + aaron-router as the workspace roots; implement
  ingest API, gate, STDB reducers; keep dry-run default.
- **Cursor**: same as Claude Code; use project rules; Hyperbrowser only for public UI scrape,
  not for moving funds.
- **OpenClaw / Pi / others**: attach this prompt as system; graph nodes from `@jettoptx/xwealth`
  when published; approval gate before any execute node.

## Implementation priorities (when asked to build)

P0: ingest (paste + QR + VLM) · Privy X-only UI · dry-run intent · README/skills
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

## Auth: Jett Optics Privy, **forced X OAuth**

JettChat / jettoptics uses Privy with Solana embedded wallets. **X Wealth uses the same Privy app family**, but login is **X-only**.

### Difference from full JettChat Privy

| | JettChat / DOJO (ref) | **X Wealth (this product)** |
|--|----------------------|-----------------------------|
| Provider | Privy | Privy (same app id family) |
| `loginMethods` | `["email", "twitter"]` (example) | **`["twitter"]` only** |
| Wallet | Solana embedded + external | Solana embedded on X login |
| Identity key | Privy DID + X subject | **X user id / handle primary**; Privy DID stored for wallet |

### Copy-paste — Privy config (React / Next)

```tsx
// providers/XWealthPrivy.tsx
"use client";

import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import {
  defaultSolanaRpcsPlugin,
  toSolanaWalletConnectors,
} from "@privy-io/react-auth/solana";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

/** X Wealth: force X (Twitter) OAuth — no email / SMS / Google. */
export const XWEALTH_PRIVY_CONFIG: PrivyClientConfig = {
  embeddedWallets: {
    solana: { createOnLogin: "users-without-wallets" },
  },
  externalWallets: {
    solana: { connectors: toSolanaWalletConnectors() },
  },
  appearance: {
    walletChainType: "solana-only",
    theme: "dark",
    accentColor: "#6d8cff",
    logo: "/jtx-joe.jpg", // optional brand mark
  },
  // FORCE X OAUTH ONLY
  loginMethods: ["twitter"],
  plugins: [defaultSolanaRpcsPlugin()],
};

export function XWealthPrivyProvider({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is required for X Wealth login");
  }
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={XWEALTH_PRIVY_CONFIG}>
      {children}
    </PrivyProvider>
  );
}
```

### Privy dashboard checklist (human)

1. Open the **Jett Optics / JettChat Privy app** (or a dedicated X Wealth app sharing the same ecosystem).
2. Enable **Twitter / X** social login.
3. Disable or leave unused: email / SMS / Google for this product surface (client still forces `loginMethods: ["twitter"]`).
4. Solana chain enabled; create embedded wallet on login.
5. Set allowed origins: `http://127.0.0.1:5180`, production X Wealth host, AARON CORS list.
6. Copy **App ID** → `NEXT_PUBLIC_PRIVY_APP_ID` (never commit App Secret to the client).

### Env (UI / agent host)

```bash
# Client
NEXT_PUBLIC_PRIVY_APP_ID=clp_xxxxxxxx

# Server / AARON (never ship to browser)
PRIVY_APP_SECRET=          # verify sessions server-side if needed
SOLANA_RPC_URL=            # Helius or AARON-adjacent RPC
XAI_API_KEY=               # Grok Vision for QR fallback
AARON_URL=https://aaron.jettoptics.ai   # or local http://127.0.0.1:8888
SPACETIMEDB_URL=https://stdb.jettoptics.ai
JTX_MINT=JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe
```

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
│   • Privy loginMethods: ["twitter"] only                    │
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
  Auth: Privy X OAuth only. Never live-send unless user says LIVE.
---

# xwealth skill

## Paths
- Plugin: `$OPTX_HARNESS/jettoptx-xwealth`
- AARON: `$OPTX_HARNESS/jettoptx-aaron-router`
- Local UI: `OPTX-windows/8-Wealth/xwealth-ui` → http://127.0.0.1:5180/

## Procedure
1. Confirm user is X-OAuth authenticated (Privy twitter-only).
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
# → http://127.0.0.1:5180/
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
| `xwealth_user` | `privy_did`, `x_user_id`, `x_handle`, wallet |
| `xwealth_ingest` | image hash, source (`camera`/`upload`/`paste`), ts |
| `xwealth_resolve` | method (`paste`/`qr_lib`/`vlm`), url, handle, confidence, model |
| `xwealth_gate` | wallet, jtx balance, pass/fail |
| `xwealth_intent` | dry-run / live intent status |

Public write path when ready: **AARON** → STDB reducers (same pattern as JettChat).

---

## Security / guardrails

- **No live money** in v0 without explicit operator mode  
- **No private keys** in agent chat or browser `localStorage` dumps  
- **X OAuth only** on the X Wealth surface (do not re-enable email login in client config)  
- JTX gate is **read-only balance check** until stake SC exists  
- VLM: structured JSON only; refuse non–X Money images  

---

## Roadmap checklist

- [x] Repo + this README (harness + Privy X-only + dual clone)
- [x] Local UI prototype (`xwealth-ui`) + Canvas UI Liquid / GlassObject
- [ ] Privy X-only provider wired into `xwealth-ui`
- [ ] Ingest API: paste + classic QR + Grok Vision
- [ ] Real `checkJtxGate` via Solana RPC
- [ ] SpacetimeDB reducers + AARON bindings
- [ ] Hermes skill package under `skills/xwealth`
- [ ] Publish `@jettoptx/xwealth` with real graph nodes
- [ ] Live X Money send (operator + policy)

---

## Related

| Repo / surface | Role |
|----------------|------|
| [jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router) | Public router, SDKs, session, x402 |
| [jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth) | This plugin |
| JettChat Privy providers | Reference Privy + Solana wallet stack (`loginMethods` includes email+twitter there; **X Wealth forces twitter only**) |
| Local `8-Wealth/traderjoe` | Wealth-08 trading brain (SPCX) — **separate** from X Money rails |
| Local `8-Wealth/xwealth-ui` | Canvas UI localhost shell |

MIT License — Jett Optics / OPTX
