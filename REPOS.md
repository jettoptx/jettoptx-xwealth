# jettoptx GitHub org — public vs private

Use this when publishing for Exhibit, Grok marketplace, or agent installs.

## Required for X Wealth beta (installers)

| Repo | Visibility | Why |
|------|------------|-----|
| **[jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth)** | **Public** | Plugin, skills, dry-run CLI, Grok plugin package |
| **[jettoptx/jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router)** | **Public** (recommended) | Optional edge router / sessions / x402 patterns for full stack demos |

## Strongly recommended public (Exhibit / Grok)

| Repo | Visibility | Why |
|------|------------|-----|
| **jettoptx/grok-plugins** *(create if missing)* | **Public** | Marketplace catalog: `marketplace.json` → pin xwealth SHA |
| **jettoptx/hermes-xai-oauth-wsl** *(if used in docs)* | Public | Community OAuth helper (already separate product) |

## Keep private (do not publish for X Wealth)

| Content | Why private |
|---------|-------------|
| Founder machine paths, home dirs, Tailscale mesh maps | Operational security |
| Jetson/K3s inventory, internal IPs | Infrastructure |
| Hermes SOUL with full wallet/incident detail | Identity / incident response |
| Live OAuth client **secrets**, bookmark refresh tokens | Credentials |
| Hot agent keypairs (`joe-agent.json`, `id.json`) | Key material |
| Internal monorepos / vault handovers with secrets | Mixed sensitivity |
| Security incident deep dives with raw tx trails | LE / recovery sensitivity |

## Product surfaces (not git, but public-facing)

| Surface | Status | Notes |
|---------|--------|--------|
| **wealth.astroknots.space** | Target host for X Wealth UI | Point DNS + deploy Next/Vite build |
| **jtx.agency** | Parked | Can CNAME or marketing → wealth |
| **agentcommunity.org/m/jett-optics** | Community | Link to docs/repo; not runtime host |
| X Developer app **Jett Optical Encryption** | Console | App id public; **secret server-only** |

## What installers clone (copy-paste)

```bash
# Minimum (beta dry-run + JTX gate + skill)
git clone https://github.com/jettoptx/jettoptx-xwealth.git

# Full edge demo (optional)
git clone https://github.com/jettoptx/jettoptx-aaron-router.git
```

## Grok Build marketplace entry (when `grok-plugins` exists)

```json
{
  "name": "xwealth",
  "description": "OPTX X Wealth: JTX gate, X Money dry-run intents, Hermes/Grok skills.",
  "category": "development",
  "source": {
    "source": "url",
    "url": "https://github.com/jettoptx/jettoptx-xwealth.git",
    "sha": "<pin-full-commit-sha>"
  },
  "homepage": "https://github.com/jettoptx/jettoptx-xwealth",
  "keywords": ["xwealth", "jtx", "solana", "x-money", "optx", "hermes"]
}
```

## Checklist before flipping a repo public

- [ ] No absolute user home paths  
- [ ] No private keys or `.env` with secrets  
- [ ] No internal mesh IPs / hostnames of personal devices  
- [ ] Example handles are generic (`demo_user`)  
- [ ] Fee treasury is intentional public receiver address (or env-only)  
- [ ] LICENSE present  
- [ ] `npm test` green  
