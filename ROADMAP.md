# Roadmap — X Wealth (Augment-08)

Audience: **developers** installing the plugin and **users** running agents (Hermes / Grok / others).

## Today — Beta (shipped)

| Capability | Status |
|------------|--------|
| Solana wallet + **≥1 JTX** gate | ✅ |
| Parse X Money `/pay/` and `/transfer/` links | ✅ |
| `npm run dry-run` intent JSON (no funds) | ✅ |
| LIVE settle blocked | ✅ |
| Hermes skill `skills/xwealth` | ✅ |
| Grok plugin package (this repo) | ✅ packaging |
| No Privy | ✅ |
| SpacetimeDB **not** required for beta | ✅ |

**Install:** see [INSTALL.md](./INSTALL.md).

## Next — Public product surface

| Item | Owner | Notes |
|------|--------|--------|
| Deploy UI to **wealth.astroknots.space** | Ops | Primary host |
| Optional brand **jtx.agency** | Ops | DNS / marketing |
| Link from [agentcommunity.org/m/jett-optics](https://agentcommunity.org/m/jett-optics) | Comms | Community, not runtime |
| Publish **jettoptx-xwealth** (and aaron-router) as **public** | Org | See [REPOS.md](./REPOS.md) |
| `grok plugin install jettoptx/jettoptx-xwealth` verified | DevRel | Exhibit demo script |
| X Developer **Exhibit** package for app **Jett Optical Encryption** | Product | OAuth + agent dry-run demo |

## Later — Production money & API

| Item | Notes |
|------|--------|
| Hosted X API proxy | Meter usage; fee → treasury (env `FEE_RECEIVER_SOLANA`) |
| USDC fee collection (Solana primary, Base secondary) | Policy in `agent-cards/crypto-rails.json` |
| MPP / x402 for agent→API pay | Parallel to social X Money intents |
| LIVE settle path | Only with explicit policy + matching signer |
| Optional SpacetimeDB usage ledger | Not a beta blocker |
| Agentcard | **Optional** third-party cards — not required to install |

## Non-goals (explicit)

- Requiring Agentcard company login to use the plugin  
- Claiming LIVE USDC→X Money without a real bridge  
- Publishing OAuth client secrets  


## Version framing

| Tag | Meaning |
|-----|---------|
| **v0.1.x beta** | Dry-run + JTX gate + skills |
| **v0.2** | Public host + Grok marketplace listing |
| **v1.0** | Metered X proxy + documented LIVE policy |
