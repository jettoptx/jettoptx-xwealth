# X Wealth — ship status (beta)

**Status:** **Augment-08 beta / dry-run** — safe to merge and demo. **Not** live money production.

## Ship as beta ✅

- Wallet + **≥1 JTX** gate (`npm run setup`, `check-jtx`)
- Hermes / Grok skill install docs
- Optional Jett Optics X OAuth identity (app `32724640`)
- USDC Sol/Base policy + fee treasury `9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7`
- UI: `OPTX-windows/8-Wealth/xwealth-ui` → http://localhost:3001/
- **No Privy**

## Not production yet ❌

- Live X Money settle / USDC→X Money bridge
- Hosted X API proxy with metered fee to treasury
- MPP / x402 agent pay wiring
- SpacetimeDB usage ledger (Jetson path)
- Full automated test suite

## Dev install

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
export SOLANA_WALLET='<pubkey>'
npm install && npm run setup
cp skills/xwealth/SKILL.md ~/.hermes/...   # or AppData Local hermes custom-skills
```

UI (Windows prototype):

```bash
cd OPTX-windows/8-Wealth/xwealth-ui
npm install && npm run dev
# http://localhost:3001/
```
