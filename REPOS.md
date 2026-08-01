# Repos to install

## Architecture (2026-07-31)

| Layer | Location | Role |
|-------|----------|------|
| **Web product** | **`apps/web` in this repo** | Public product shell · **xwealth.space** · Privy login · augments marketplace · pay console · WARP/MOA |
| **Agent plugin** | **This repo root** | Skills · dry-run CLI · JTX ≥1 gate · **no Privy** |

**Canonical repo:** [jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth)

Former outer-shell repo [jettoptx/xwealth](https://github.com/jettoptx/xwealth) is **folded into `apps/web`** — do not clone it as a separate product tree.

## Minimum

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
```

| Path | Role |
|------|------|
| **repo root** | Agent plugin, skills, dry-run CLI, Grok plugin |
| **`apps/web`** | Outer web product on xwealth.space |

## Web UI (`apps/web`)

| Surface | URL |
|---------|-----|
| **Production** | **https://xwealth.space** |
| Login | https://xwealth.space/login |
| Console (post-login) | https://xwealth.space/console |
| Augments marketplace | https://xwealth.space/augments |

```bash
cd apps/web
npm install
npm run dev   # http://localhost:8080
```

After **Continue with X**, users land on the console and can open **Agent plugin** docs/install from Dashboard.

## Legacy

| Host / repo | Status |
|-------------|--------|
| wealth.astroknots.space | **Retired** — use **xwealth.space** |
| jettoptx/xwealth | **Folded** into `apps/web` · GitHub repo **archived** |
| jett22JOE/jettoptx-xwealth | **Folded** into `apps/web` · GitHub repo **archived** |
| Local mirrors (`*-xwealth-web`, `*-xwealth-public`, `*-xwealth-upstream`) | **Deleted** — use this clone only |

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
