# Grok Build plugin

Install **X Wealth** as a Grok Build plugin (skills for agent harness).

## Install

```bash
# From GitHub (after this repo is public)
grok plugin install jettoptx/jettoptx-xwealth --trust

# From a local clone
grok plugin install /path/to/jettoptx-xwealth --trust
```

Reload plugins (`r` in `/plugins`) or start a new session.

## What you get

| Component | Path |
|-----------|------|
| Skill | `skills/xwealth` |
| Manifest | `.grok-plugin/plugin.json` |

## After install

```bash
export SOLANA_WALLET='<pubkey>'
cd /path/to/jettoptx-xwealth   # if using npm scripts
npm install && npm run setup && npm test
npm run dry-run -- --to https://x.com/i/money/pay/demo_user --amount 1
```

## Marketplace (optional)

Add org catalog:

```bash
grok plugin marketplace add jettoptx/grok-plugins
grok plugin install xwealth --trust
```

Catalog entry format: [REPOS.md](./REPOS.md).

## Security

- Plugin skills must not embed secrets  
- Trust only official `jettoptx/*` sources for production  
