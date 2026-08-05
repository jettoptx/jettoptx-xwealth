---
name: optx-high-stakes
description: >
  OPTX high-stakes approve-action QR via real Aaron router + Jett Auth / MOJO SEND-02.
  Use when agent wants LIVE trade, payout, policy change, or any high-stakes action.
  Never silent local keypair autosign. Mint QR → show in chat → wait for phone gaze.
  Works Hermes, Grok Build, Claude Code, Codex, Cursor, Pi, traderJOE cron.
metadata:
  short-description: "High-stakes Mojo QR (approve_action)"
  augment: wealth-08
  harnesses:
    - hermes
    - grok-build
    - claude-code
    - codex
    - cursor
    - pi
---

# OPTX high-stakes (approve_action)

**Full JOE auto-swarm docs (all MOA augments):**  
`OPTX-windows/0-Core/JOE-AUTO-SWARM-HIGH-STAKES-UPGRADE-2026-08-04.md`  
Wealth ops: `OPTX-windows/8-Wealth/traderjoe/docs/JOE-AUTO-SWARM-HIGH-STAKES.md`  
Repo: `docs/JOE-AUTO-SWARM-HIGH-STAKES.md`

## Rule

**Any high-stakes action** → mint **Mojo approve QR** via Aaron.  
**Never** load a disk keypair and auto-sign as “autosign.”

Phone path: **MOJO SEND-02** (SEND chats augment) → scan bot-posted QR → **TOTP → 4-digit gaze** → release approval. Optional on-chain Aaron action fields are display/audit only in v1.

## Required repos

```bash
jettoptx-xwealth
jettoptx-aaron-router   # canonical store
# phone: jettoptx-mojo ApproveAction + jettmojo://approve
```

## Mint (CLI)

```bash
cd jettoptx-xwealth
npm run high-stakes:mint -- \
  --kind trade_buy \
  --summary "R1 buy ~1.21 SPCX ≈ $144 USDC on JTX" \
  --symbol SPCX/USDC \
  --notional 144 \
  --agent traderjoe \
  --harness hermes \
  --origin traderjoe \
  --resource "https://app.jtx.com/?asset=equity&mint=SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb"
```

Stdout JSON includes:

- `cid`
- `qrPayload` → `jettmojo://approve?cid=…&origin=…&exp=…`
- `action`

**Show the user:** deep link + human summary (+ QR image if you can render one).

## Poll / wait

```bash
npm run high-stakes:status -- --cid ch_…
npm run high-stakes:wait -- --cid ch_… --timeout 300
```

Proceed only when `status === "verified"` and you have `result.approval_id`.

## Programmatic (Node)

```ts
import { mintApproveAction, waitForApproval } from "@jettoptx/xwealth";

const ch = await mintApproveAction({
  origin: "hermes",
  action: {
    kind: "trade_buy",
    summary: "…",
    symbol: "SPCX/USDC",
    notional_usdc: "144",
    agent: "traderjoe",
    harness: "hermes",
  },
});
// display ch.qrPayload
const done = await waitForApproval(ch.cid);
```

Env: `AARON_ROUTER_URL` (default `https://aaron.jettoptics.ai`).

## HTTP (xwealth web)

- `POST /api/optx/high-stakes` — mint (JTX gate)
- `GET /api/optx/high-stakes?cid=` — poll

## Aaron API (canonical)

- `POST /jett/totp/challenge` `{ type: "approve_action", action, origin }`
- `GET /jett/totp/status?cid=`
- `POST /jett/challenge/approve-complete` (MOJO only)

Docs: `jettoptx-aaron-router/docs/mojo-approve-action-challenge.md`

## vs sign_tx

| Type | Use |
|------|-----|
| `approve_action` | JTX Smart Fill clips, policy, LIVE GO, bot desk actions |
| `sign_tx` | Real Solana USDC / x402 with `unsignedTx` or phone-built transfer |

## Do not

- Silent keypair autosign from cron / harness
- Skip QR for LIVE
- Store secrets in chat (only cid + public deep link + summary)
- Treat approval as unlimited spend — only the stated action under caps
