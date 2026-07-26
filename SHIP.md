# Ship status (beta)

**Status:** Augment-08 **beta / dry-run**. Safe for public install demos. **Not** live money production.

**SpacetimeDB:** not required for gate, parse, dry-run, or skills.

## Shipped ✅

- Wallet + **≥1 JTX** gate (`npm run setup`, `check-jtx`)
- Hermes / Grok skill packaging
- Optional X OAuth identity docs (Jett Optical Encryption app — public client id only)
- Parse `https://x.com/i/money/pay/{handle}` and `/transfer/{handle}`
- USDC Sol/Base policy (`agent-cards/crypto-rails.json`)
- Fee receiver configurable via `FEE_RECEIVER_SOLANA`
- `npm test` + `npm run dry-run`
- Optional local signer path `XWEALTH_KEYPAIR` (secret never in intent JSON)
- **No Privy** · no secrets in git

## Not shipped ❌

- Live X Money settle / USDC→X Money bridge  
- Hosted X API proxy with metered fees  
- MPP / x402 wiring  
- Optional usage ledger  
- Full e2e UI suite in this repo  

## Install

See **[INSTALL.md](./INSTALL.md)** and **[REPOS.md](./REPOS.md)**.
