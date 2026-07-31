# Repos to install

## Architecture (2026-07-30)

| Layer | Repo | Role |
|-------|------|------|
| **OUTSIDE** | **[jettoptx/xwealth](https://github.com/jettoptx/xwealth)** | Public product shell · **xwealth.space** · Privy login · augments map · pay console |
| **INSIDE** | **This repo** (`jettoptx/jettoptx-xwealth`) | Agent plugin option after login · skills · dry-run CLI · JTX ≥1 · **no Privy** |

## Minimum (agent plugin beta)

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
```

| Repo | Role |
|------|------|
| **[jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth)** | Agent plugin, skills, dry-run CLI, Grok plugin (this root) |
| **[jettoptx/xwealth](https://github.com/jettoptx/xwealth)** | Outer web product on xwealth.space |

## Web UI (outer shell — not this root)

| Surface | URL |
|---------|-----|
| **Production** | **https://xwealth.space** |
| Login | https://xwealth.space/login |
| Console (post-login) | https://xwealth.space/console |
| Augments map | https://xwealth.space/augments |

After **Continue with X** on the **outer** app, users land on the console and can open **Agent plugin** (this repo) from Dashboard.

Plugin / agent code stays at this repo root (`src/`, `skills/`, `scripts/`).  
`apps/web` here is a mirror only — canonical outer UI is **jettoptx/xwealth**.

## Legacy

| Host / repo | Status |
|-------------|--------|
| wealth.astroknots.space | **Retired** — use **xwealth.space** |

## Optional

| Repo | When |
|------|------|
| **[jettoptx/jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router)** | Edge sessions / public router |
| **jettoptx/grok-plugins** *(if published)* | Grok marketplace browse |

```bash
# optional
git clone https://github.com/jettoptx/jettoptx-aaron-router.git
```

## Grok Build

```bash
grok plugin install jettoptx/jettoptx-xwealth --trust
```

See [GROK-PLUGIN.md](./GROK-PLUGIN.md).

## Auth split (important)

| Surface | Auth |
|---------|------|
| **Agent plugin** (this root) | Solana wallet + **≥1 JTX** · optional X OAuth · **no Privy** |
| **Web dashboard** (`apps/web` / xwealth.space) | **Privy** X-first for E𝕏hibit / product login · pay link is the money rail |

## Safety

- Public keys only in client env (`SOLANA_WALLET`, `VITE_PRIVY_APP_ID`).
- Never commit keypairs or OAuth secrets.
- Prefer official `jettoptx/*` sources.

Full steps: [INSTALL.md](./INSTALL.md) · Dashboard: [apps/web/README.md](./apps/web/README.md) · Roadmap: [ROADMAP.md](./ROADMAP.md).
