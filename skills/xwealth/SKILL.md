---
name: xwealth
description: >
  X Money QR/link ingest + JTX gate for OPTX Augment-08.
  Use when user says xwealth, X Money QR, transfer link, or JTX gate.
  Requires clones: jettoptx-xwealth + jettoptx-aaron-router.
  Auth: Jett Optics X OAuth app (optional) + Solana wallet + JTX ≥1 gate.
  No Privy. Never live-send unless user says LIVE.
  Works with Hermes, OpenClaw, Grok Build, Claude Code, Codex, Cursor, Pi.
metadata:
  short-description: "X Money QR + JTX gate (Augment-08)"
  augment: wealth-08
  harnesses:
    - hermes
    - openclaw
    - grok-build
    - claude-code
    - codex
    - cursor
    - pi
---

# xwealth skill

Load full system prompt: `prompts/AGENT_SYSTEM.md` in this repo.

## Required repos

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
git clone https://github.com/jettoptx/jettoptx-aaron-router.git
```

## Install this skill on common harnesses

```bash
# Hermes
mkdir -p ~/.hermes/skills/custom/xwealth
cp skills/xwealth/SKILL.md ~/.hermes/skills/custom/xwealth/SKILL.md

# Grok Build
mkdir -p ~/.grok/skills/xwealth
cp skills/xwealth/SKILL.md ~/.grok/skills/xwealth/SKILL.md
```

| Harness | Also put |
|---------|----------|
| Claude Code | Section in `CLAUDE.md` or copy `prompts/AGENT_SYSTEM.md` |
| Codex | `AGENTS.md` include / paste |
| Cursor | `.cursor/rules/xwealth.mdc` pointing at `prompts/AGENT_SYSTEM.md` |
| OpenClaw / Pi | System / persona node = `prompts/AGENT_SYSTEM.md` |

## Auth (no Privy)

1. **Required:** Solana wallet pubkey + **≥ 1 JTX v2**
   - mint `JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe`
   - `npm run setup` or `npm run check-jtx -- --wallet <PUBKEY>`
2. **Optional identity:** Jett Optical Encryption X OAuth app (`32724640`)
   - Public Client ID env: `X_CLIENT_ID` / `XWEALTH_X_CLIENT_ID`
   - Same app as Hermes x-operator / JettChat X surface
3. X OAuth does **not** create a Solana key — wallet is always separate

```bash
export SOLANA_WALLET='<pubkey>'
cd jettoptx-xwealth && npm install && npm run setup
# exit 0 = plugin ready; exit 1 = need ≥1 JTX
```

## Procedure

1. `npm run setup` — wallet + JTX gate (lock tools if fail).
2. Accept paste URL **or** image (prefer phone capture of live X Money QR).
3. Decode: classic QR first → Grok Vision fallback.
4. Normalize `{ handle, transferUrl, confidence, method }`.
5. Dry-run payout intent; persist via AARON → SpacetimeDB when wired.
6. **STOP** before live payout unless explicit LIVE + policy pass.

## Local UI

`OPTX-windows/8-Wealth/xwealth-ui` → http://127.0.0.1:3001/

## Agentcard (virtual cards + MCP)

For any agent that downloads this repo:

```bash
npm run agent-cards:setup
# after human login:
npm run agent-cards:wizard
# or:
npx agent-cards companies wizard --agent --yes --app-name "X Wealth" --app-url http://localhost:3001
```

- Skills land in `.agents/skills/` (`agent-card`, `mcp-server`)
- MCP example: `agent-cards/mcp.agent-cards.example.json`
- **Crypto default:** convert / cash-out as **USDC** on **Solana** or **Base** (`agent-cards/crypto-rails.json`)
- Cards are live money — require human confirm before create/withdraw/checkout

## Do not

- Reintroduce Privy on this surface
- Store private keys / X client secrets in chat
- Call live send without human LIVE confirmation
- Use Postgres/Convex as product DB (SpacetimeDB only)
- Treat X OAuth alone as gate pass (must hold ≥1 JTX)
