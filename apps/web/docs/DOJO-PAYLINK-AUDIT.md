# DOJO paylink audit — https://xwealth.space/dojo

**Date:** 2026-08-03  
**Repo:** `jettoptx/jettoptx-xwealth` · route confirmed in `routeTree.gen.ts` (`path: '/dojo'`)

---

## Report table

| Question | Answer |
|----------|--------|
| Exact route file(s) | `apps/web/src/routes/dojo.tsx` (TanStack file route `/dojo`) |
| Where paylink / X Money URL is built | `apps/web/src/lib/xmoney.ts` → `buildXMoneyUrl` / `parseXMoneyInput`; UI: `apps/web/src/components/pay-link-panel.tsx` |
| Where x402 `/api/x402/pay` is called | `apps/web/src/components/x402-panel.tsx` → `fetch("/api/x402/pay")`; server: `apps/web/src/routes/api/x402/pay.ts` |
| Where JTX ≥1 gate is enforced (or missing) | **Was missing on `/dojo`.** Now UI-enforced via `checkJtxGate` (`apps/web/src/lib/jtxGate.ts`) on the DOJO page; CLI gate remains `scripts/check-jtx-gate.mjs`. Server money APIs do **not** re-check JTX (documented residual — see security audit). |
| Does /dojo need a **new** paylink UI or wire existing? | **Wire existing.** Reuse `PayLinkPanel` + `X402Panel` + `MoneySetupBanner` (same as `/console`). No forked pay UI. |

---

## Before this change

`dojo.tsx` was a hub-only page: links to WARP / MDX docs / Augments / Settings. **No paylink CTA, no x402 panel, no JTX gate.**

## After this change

`/dojo` is the operator **paylink hub**:

1. JTX ≥1 wallet check (locks x402 tools until PASS)
2. `PayLinkPanel` — paste/QR X Money URL → QR + payload
3. `X402Panel` — dry-run default → `POST /api/x402/pay` → X Money `actionUrl` on LIVE intent
4. Visible **DRY-RUN default** badge; LIVE requires server `X402_LIVE_ENABLED=true`

### Component map (imports)

| Piece | File |
|-------|------|
| Route shell | `routes/dojo.tsx` |
| X Money paylink + QR | `components/pay-link-panel.tsx` |
| x402 dry-run / REAL UI | `components/x402-panel.tsx` |
| Money setup banner | `components/money-setup-banner.tsx` |
| JTX gate helper | `lib/jtxGate.ts` |
| X Money URL builders | `lib/xmoney.ts` |
| USDC / Solana payTo helpers | `lib/usdc-payto.ts` |
| x402 envelope + settle | `lib/x402.ts` |
| API | `routes/api/x402/pay.ts` |

### Paylink surface fields

- **Amount (USDC)** — X402Panel amount input (default `0.10`)
- **payTo** — X Money URL from linked handle (`https://x.com/i/money/pay/{handle}`); Mojo Solana pubkey is separate (`resolveSolanaPayTo`) — **not EFvg**
- **Dry-run vs REAL** — mode toggle + badges; REAL still blocked server-side without `X402_LIVE_ENABLED`

### Sequence

```
User on /dojo
  → paste Solana pubkey → Check JTX ≥1
  → (fail) tools locked + “need ≥1 JTX”
  → (pass) PayLinkPanel save X Money URL
  → X402Panel dry-run → POST /api/x402/pay (402 challenge or dry-run receipt)
  → LIVE path only if server X402_LIVE_ENABLED=true → actionUrl = X Money window
  → STOP before mainnet settle unless operator LIVE env is set
```

---

## Truth notes

- Full USDC → X Money **on-chain settle** is still intent / dry-run on xwealth unless LIVE env + facilitator path is operator-enabled.
- Live metered catalog remains at `aaron.jettoptics.ai/x402` / `jtx.astroknots.space/x402` (`payTo` faucet pubkey `5ct4…Cbyc`, domain `jtxfaucet.sol`).
- Fee treasury (docs): Squads `9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7`.
