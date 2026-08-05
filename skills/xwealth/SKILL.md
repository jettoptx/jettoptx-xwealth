---
name: xwealth
description: >
  X Money QR/link ingest + JTX gate for OPTX Augment-08.
  Use when user says xwealth, X Money QR, transfer link, or JTX gate.
  Clone jettoptx-xwealth (aaron-router optional). Auth: optional X OAuth + Solana
  wallet + JTX ≥1. No Privy. No SpacetimeDB required for beta. Never live-send
  unless user says LIVE. Hermes, OpenClaw, Grok Build, Claude Code, Codex, Cursor, Pi.
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

See also: `prompts/AGENT_SYSTEM.md`, [INSTALL.md](../../INSTALL.md), [ROADMAP.md](../../ROADMAP.md).

## Required repos

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
# optional edge:
git clone https://github.com/jettoptx/jettoptx-aaron-router.git
```

## Install skill

```bash
# Hermes
mkdir -p ~/.hermes/skills/custom/xwealth
cp skills/xwealth/SKILL.md ~/.hermes/skills/custom/xwealth/SKILL.md

# Grok Build (or: grok plugin install jettoptx/jettoptx-xwealth --trust)
mkdir -p ~/.grok/skills/xwealth
cp skills/xwealth/SKILL.md ~/.grok/skills/xwealth/SKILL.md
```

## Auth (no Privy)

1. **Required:** `SOLANA_WALLET` + **≥1 JTX** (`JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe`)
2. **Optional:** X OAuth via **Jett Optical Encryption** app (public `X_CLIENT_ID` only)
3. Wallet is separate from X OAuth

```bash
export SOLANA_WALLET='<pubkey>'
cd jettoptx-xwealth && npm install && npm run setup
```

## Fee treasury (hosted X API only)

When a hosted proxy meters X API usage, fees go to `FEE_RECEIVER_SOLANA`  
(see `agent-cards/crypto-rails.json`). Paste-only link parse needs **no** X API and no fee.

## Procedure

1. `npm run setup` — gate  
2. Paste pay/transfer URL or QR  
3. `parseMoneyLink` → dry-run intent (`npm run dry-run`)  
4. **STOP** before LIVE unless product + policy allow  
5. **High-stakes LIVE** → load skill **`optx-high-stakes`**: mint Aaron `approve_action` QR (`jettmojo://approve`) → MOJO SEND-02 gaze → never silent keypair autosign  

## Hosts

- Product UI (planned): **https://wealth.astroknots.space**  
- Community: [agentcommunity.org/m/jett-optics](https://agentcommunity.org/m/jett-optics)  

## Do not

- Privy  
- Secrets in chat/git  
- LIVE without confirmation  
- Require SpacetimeDB or Agentcard for beta  
