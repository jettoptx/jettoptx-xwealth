# Repos to install

What **users and developers** clone for X Wealth. Nothing else is required.

## Minimum (beta)

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
```

| Repo | Role |
|------|------|
| **[jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth)** | Plugin, skills, dry-run CLI, Grok plugin package |

## Optional

| Repo | When you need it |
|------|------------------|
| **[jettoptx/jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router)** | Edge sessions / public router demos |
| **jettoptx/grok-plugins** *(if published)* | Browse/install via Grok Build marketplace |

```bash
# optional
git clone https://github.com/jettoptx/jettoptx-aaron-router.git
```

## Grok Build

```bash
grok plugin install jettoptx/jettoptx-xwealth --trust
```

See [GROK-PLUGIN.md](./GROK-PLUGIN.md).

## Public product hosts

| Host | Role |
|------|------|
| **https://wealth.astroknots.space** | Planned web UI |
| **https://jtx.agency** | Brand / marketing |
| [agentcommunity.org/m/jett-optics](https://agentcommunity.org/m/jett-optics) | Community |

## Safety (installers)

- Use only **public** keys in env (`SOLANA_WALLET`).  
- Never commit `.env` files, keypairs, or OAuth secrets.  
- Prefer official `jettoptx/*` sources for production.  

Full steps: [INSTALL.md](./INSTALL.md). Roadmap: [ROADMAP.md](./ROADMAP.md).
