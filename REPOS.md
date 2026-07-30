# Repos to install

Canonical product name: **jettoptx-xwealth**.

## Minimum (beta)

```bash
git clone https://github.com/jettoptx/jettoptx-xwealth.git
cd jettoptx-xwealth
```

| Repo | Role |
|------|------|
| **[jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth)** | **Canonical** — agent plugin, skills, dry-run CLI, Grok plugin, **and** web dashboard (`apps/web`) |

## Web UI (post-login dashboard)

| Surface | URL |
|---------|-----|
| **Production** | **https://xwealth.space** |
| Login | https://xwealth.space/login |
| Console (post-login) | https://xwealth.space/console |

After **Continue with X** (Privy on the web app only), users land on the **console dashboard**:

- X Money pay / transfer link + QR
- Agent harness picker (Grok / Hermes / Claude / custom)
- x402 dry-run rail
- Augments marketplace tab

Source for the dashboard lives under **`apps/web`** in this repo (folded from the temporary `jettoptx/xwealth` UI scaffold).  
Plugin / agent code stays at repo root (`src/`, `skills/`, `scripts/`).

## Temporary / legacy

| Repo | Status |
|------|--------|
| **[jettoptx/xwealth](https://github.com/jettoptx/xwealth)** | Temporary Grok Build UI push — **fold into `apps/web` here**, then archive |
| wealth.astroknots.space | Older host / alias — prefer **xwealth.space** |

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
