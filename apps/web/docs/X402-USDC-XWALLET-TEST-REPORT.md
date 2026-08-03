# x402 USDC → X Wallet Pay — test report

**Date:** 2026-08-03  
**Goal:** Prove the path USDC x402 → X Money / X Wallet Pay **intent** works; document LIVE gaps.

---

## Results

| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| A1 `GET aaron.jettoptics.ai/x402` | 200 catalog JSON, USDC mint, payTo faucet | 200 · `asset=EPjF…Dt1v` · `payTo=5ct4…Cbyc` · `payToDomain=jtxfaucet.sol` · services chat/gaze/task | **Pass** |
| A2 `GET jtx.astroknots.space/x402` | Catalog mirror | Same shape as AARON catalog | **Pass** |
| A3 `GET xwealth.space/api/x402/pay` | 402 + payment required envelope | 402 · `maxAmountRequired=0.10` · `payTo=https://x.com/i/money/pay/jettoptx` · mint USDC | **Pass** |
| A4 `POST xwealth.space/api/x402/pay` `{}` | 402 challenge (no signature) | 402 · same envelope · `destination: x-money` | **Pass** |
| B1 `npm test` (root plugin) | All unit tests pass | **15/15 pass** | **Pass** |
| B2 `npm run dry-run -- --to …/demo_user --amount 1` | Dry-run pipeline; gate checked | Parses handle + URL; `live:false`; blocked when wallet has 0 JTX (honest gate) | **Pass** |
| C1 `/dojo` route ownership | `dojo.tsx` serves paylink | Wired: JTX gate + `PayLinkPanel` + `X402Panel` | **Pass** |
| C2 UI path dry-run → X Money | POST pay → receipt / actionUrl | Code path: `x402-panel.tsx` → `/api/x402/pay` → settle dry-run; LIVE `actionUrl` = X Money URL | **Pass** (code + live 402 probe) |
| C3 LIVE settle blocked by default | No mainnet without operator env | Server requires `X402_LIVE_ENABLED=true`; client header alone insufficient (fixed this PR) | **Pass** |
| C4 On-chain USDC → X Wallet settle | End-to-end funded settle | **Not shipped** — intent / dry-run only until facilitator + LIVE env | **Blocked** (documented) |

---

## Sample shapes (redacted)

### 402 advertise (no signature)

```http
GET /api/x402/pay → 402
```

```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "solana-mainnet",
    "maxAmountRequired": "0.10",
    "asset": "USDC",
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "payTo": "https://x.com/i/money/pay/jettoptx",
    "extra": {
      "destination": "x-money",
      "xHandle": "jettoptx",
      "xMoneyUrl": "https://x.com/i/money/pay/jettoptx"
    }
  }]
}
```

### Dry-run settle (conceptual)

```http
POST /api/x402/pay
PAYMENT-SIGNATURE: <base64 JSON payload dryRun:true>
→ 200 { "success": true, "dryRun": true, "note": "Dry-run only — no on-chain send…" }
```

### LIVE (operator only)

Requires server `X402_LIVE_ENABLED=true`. Response may include `actionUrl` = X Money URL and optional Helius broadcast if `serializedTransaction` attached. **Not exercised against mainnet in this test.**

---

## Sequence (product)

```
User on /dojo
  → optional X login (Privy) / paste wallet
  → JTX ≥1 check (UI + CLI semantics)
  → select USDC amount + X Money pay link
  → POST /api/x402/pay (402 or dry-run JSON)
  → build / open X Money Wallet Pay link (actionUrl)
  → STOP before LIVE settle unless X402_LIVE_ENABLED
```

---

## Gaps

| Gap | Status |
|-----|--------|
| Full USDC on-chain → X Wallet settle | Intent-only on xwealth |
| Server-side JTX re-check on settle | Not yet |
| payTo allowlist | Not yet |
| Crypto verify PAYMENT-SIGNATURE | Not yet |

Treasury (docs only): Squads `9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7`.
