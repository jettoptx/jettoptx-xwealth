---
name: xwealth
description: >
  X Money QR/link ingest + JTX gate for OPTX Augment-08.
  Use when user says xwealth, X Money QR, transfer link, or JTX gate.
  Requires clones: jettoptx-xwealth + jettoptx-aaron-router.
  Auth: Privy X OAuth only. Never live-send unless user says LIVE.
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

## Auth

- Privy: `loginMethods: ["twitter"]` **only**
- Identity: X handle / id + Privy DID + Solana embedded wallet

## Procedure

1. Confirm X-OAuth session.
2. Accept paste URL **or** image (prefer phone capture of live X Money QR).
3. Decode: classic QR first → Grok Vision fallback.
4. Normalize `{ handle, transferUrl, confidence, method }`.
5. `checkJtxGate(wallet)` — mint `JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe` ≥ 1.
6. Dry-run payout intent; persist via AARON → SpacetimeDB when wired.
7. **STOP** before live payout unless explicit LIVE + policy pass.

## Local UI

`OPTX-windows/8-Wealth/xwealth-ui` → http://127.0.0.1:5180/

## Do not

- Enable email/Google login on this surface
- Store private keys in chat
- Call live send without human LIVE confirmation
- Use Postgres/Convex as product DB (SpacetimeDB only)
