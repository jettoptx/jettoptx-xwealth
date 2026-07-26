# X Wealth — ship status (beta)

**Status:** **Augment-08 beta / dry-run** — safe to merge and demo. **Not** live money production.

**SpacetimeDB:** **Not required** for this app’s beta path (gate, QR/link parse, UI, dry-run intent). Optional later for usage ledger only.

## Ship as beta ✅

- Wallet + **≥1 JTX** gate (`npm run setup`, `check-jtx`)
- Hermes / Grok skill install docs
- Optional Jett Optics X OAuth identity (app `32724640`)
- Parse **both** `https://x.com/i/money/pay/{handle}` and `/transfer/{handle}`
- USDC Sol/Base policy + fee treasury `9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7` (docs)
- UI: `OPTX-windows/8-Wealth/xwealth-ui` → http://localhost:3001/
  - Browser JTX gate uses Vite proxy `/api/solana-rpc` (avoids public RPC Origin 403)
- Unit tests: `npm test` (parse + dry-run + LIVE blocked)
- CLI dry-run: `npm run dry-run -- --to <url|handle> --amount 1`
- Local signer path env `XWEALTH_KEYPAIR` (optional; secret never in intent JSON)
- **No Privy** · **No secrets in git** (see `.gitignore`) · **No STDB required**

## Not production yet ❌

- Live X Money settle / USDC→X Money bridge
- Local/hot **signer** path for LIVE (keypair stays off-repo)
- Hosted X API proxy with metered fee to treasury
- MPP / x402 agent pay wiring
- Optional SpacetimeDB usage ledger (Jetson) — **not a beta blocker**
- Full e2e UI suite

## Dev install

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
export SOLANA_WALLET='<pubkey>'   # never commit private keys
npm install && npm run setup && npm test
cp skills/xwealth/SKILL.md ~/.hermes/...   # or AppData Local hermes custom-skills
```

UI (Windows prototype — separate tree):

```bash
cd OPTX-windows/8-Wealth/xwealth-ui
npm install && npm run dev
# http://localhost:3001/
```
