# Install guide — users & developers

**X Wealth** is OPTX **Augment-08** (beta / dry-run).  
No Privy. No private keys in git. Live settle is **not** shipped yet.

## What to install

| Audience | Required repos | Optional |
|----------|----------------|----------|
| **End user / agent harness** | [jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth) | — |
| **Edge / sessions / x402 router** | + [jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router) | when using AARON health, sessions, public edge |
| **Grok Build plugin** | same `jettoptx-xwealth` (see [GROK-PLUGIN.md](./GROK-PLUGIN.md)) | or marketplace `jettoptx/grok-plugins` when published |
| **Hermes skill** | copy `skills/xwealth/` into Hermes `custom-skills/` | see skill README section below |

You do **not** need SpacetimeDB, Jetson, or any private monorepo for the beta path.

## Quick start (any OS)

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
export SOLANA_WALLET='<your-solana-pubkey>'   # public key only
npm install
npm run setup          # wallet resolve + JTX ≥1 gate
npm test
npm run dry-run -- --to https://x.com/i/money/pay/demo_user --amount 1
```

**PowerShell:**

```powershell
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
$env:SOLANA_WALLET = "<your-solana-pubkey>"
npm install
npm run setup
npm test
npm run dry-run -- --to "https://x.com/i/money/pay/demo_user" --amount 1
```

Exit codes for `setup` / gate: `0` pass · `1` need ≥1 JTX · `2` no wallet.

## Hermes

```bash
# After clone
mkdir -p ~/.hermes/skills/custom/xwealth   # or your HERMES_HOME/custom-skills/xwealth
cp skills/xwealth/SKILL.md ~/.hermes/skills/custom/xwealth/
# Restart Hermes / reload skills
```

Windows Hermes often uses `%LOCALAPPDATA%\hermes\custom-skills\xwealth\`.

## Grok Build

```bash
grok plugin install jettoptx/jettoptx-xwealth --trust
# or: grok plugin install ./jettoptx-xwealth --trust
```

See [GROK-PLUGIN.md](./GROK-PLUGIN.md).

## Hosted product UI (planned)

| Host | Role |
|------|------|
| **https://wealth.astroknots.space** | Primary public X Wealth web surface (recommended) |
| **https://jtx.agency** | Parked brand / alternate apex |
| [agentcommunity.org/m/jett-optics](https://agentcommunity.org/m/jett-optics) | Community presence — not the app host |

Local UI prototypes stay private; production builds deploy to the hosts above.

## Env (public-safe)

| Variable | Required | Notes |
|----------|----------|--------|
| `SOLANA_WALLET` | for gate | Base58 **pubkey** only |
| `SOLANA_RPC_URL` | no | Default public mainnet-beta |
| `XWEALTH_KEYPAIR` | no | Local path to keypair JSON for future LIVE — never commit |
| `FEE_RECEIVER_SOLANA` | no | Override fee treasury for hosted metering |
| `X_CLIENT_ID` | no | Public X OAuth client id for identity features |
| `X_CLIENT_SECRET` | server only | Never ship in browser or skills |

## Security

- Never commit private keys, seeds, or OAuth refresh tokens  
- Dry-run never moves funds  
- LIVE settle requires explicit product release + operator policy  

## Next reading

- [ROADMAP.md](./ROADMAP.md) — beta → production  
- [REPOS.md](./REPOS.md) — org public/private matrix  
- [SHIP.md](./SHIP.md) — what is / isn’t shipped  
