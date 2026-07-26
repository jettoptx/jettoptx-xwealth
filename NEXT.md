# Next steps (maintainers)

Internal planning after beta. Keep operational paths out of public commits.

## Validate beta

```bash
export SOLANA_WALLET='<pubkey-with-jtx>'
npm run setup && npm test
npm run dry-run -- --to https://x.com/i/money/pay/demo_user --amount 1
```

Expect `ok: true`, `live: false`, LIVE blocked.

## Product hosts

1. Deploy UI → **wealth.astroknots.space**  
2. Optional: **jtx.agency** → redirect/marketing  
3. Community link: [agentcommunity.org/m/jett-optics](https://agentcommunity.org/m/jett-optics)

## Org hygiene

- Keep this repo **public** for installs  
- Publish **aaron-router** when edge demos are required  
- Create **jettoptx/grok-plugins** catalog when ready for marketplace browse  
- Never push founder SOUL, mesh IPs, or key material  

See [ROADMAP.md](./ROADMAP.md) and [REPOS.md](./REPOS.md).
