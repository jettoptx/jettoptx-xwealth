# JOE Auto-Swarm — OPTX High-Stakes (xwealth repo)

Canonical vault SSOT:  
`OPTX-windows/0-Core/JOE-AUTO-SWARM-HIGH-STAKES-UPGRADE-2026-08-04.md`

Aaron wire protocol:  
`../jettoptx-aaron-router/docs/mojo-approve-action-challenge.md` (sibling clone)

---

## Package surface

| Path | Role |
|------|------|
| `src/high-stakes.ts` | `mintApproveAction` · `pollChallenge` · `waitForApproval` |
| `scripts/high-stakes-cli.mjs` | CLI mint / status / wait |
| `apps/web/src/routes/api/optx/high-stakes.ts` | Proxy + JTX gate |
| `skills/optx-high-stakes/SKILL.md` | All harnesses |
| `skills/xwealth/SKILL.md` | Points here for LIVE |

```bash
npm run high-stakes:mint -- --kind trade_buy --summary "…" --agent traderjoe
npm run high-stakes:status -- --cid ch_…
npm run high-stakes:wait -- --cid ch_…
```

Env: `AARON_ROUTER_URL` (default `https://aaron.jettoptics.ai`).

---

## Challenge type

`POST /jett/totp/challenge` with `type: "approve_action"` and `action: { kind, summary, … }`.

QR: `jettmojo://approve?cid=…&origin=…&exp=…`  
Close: MOJO `POST /jett/challenge/approve-complete` (4-digit gaze; no Solana sig required in v1).

Keep **`sign_tx`** for real USDC spends. Do not overload approve with silent transfer authority.

---

## MOA (short)

| Augment | Role |
|---------|------|
| 0 Core | Doctrine: no silent autosign |
| 1 Vision | Gaze digits |
| 2 Send + MOJO SEND-02 | Human QR complete |
| 4 Shield / Aaron | Challenge truth |
| **6 Search** | Mesh + external search (Aaron health, logs, deploy status) — **not GENSYS** |
| 8 Wealth | Trade meta + ladder + JTX gate |
| 9 Vector | Future approval journal |

Full table: vault Core doc. MOA 6 = `6-Search/` only.

---

## Safety

- Never load `XWEALTH_KEYPAIR` / solana id.json for high-stakes “autosign”  
- Dry-run / paper free  
- LIVE → mint → show QR → wait verified  
