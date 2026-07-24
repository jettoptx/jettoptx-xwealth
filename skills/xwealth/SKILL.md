---
name: xwealth
description: >
  X Money QR/link ingest + JTX gate for OPTX Augment-08.
  Use when user says xwealth, X Money QR, transfer link, or JTX gate.
  Requires clones: jettoptx-xwealth + jettoptx-aaron-router.
  Auth: Privy X OAuth only. Never live-send unless user says LIVE.
metadata:
  short-description: "X Money QR + JTX gate (Augment-08)"
  augment: wealth-08
---

# xwealth skill

## Required repos

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
git clone https://github.com/jettoptx/jettoptx-aaron-router.git
```

## Auth

- Privy config: `loginMethods: ["twitter"]` **only** (Jett Optics Privy family, X forced).
- Identity: X handle / user id + Privy DID + Solana embedded wallet.

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
