# apps/web — X Wealth post-login dashboard

**Product host:** https://xwealth.space  
**Canonical repo:** [jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth)

This app is the **signed-in console** for operators:

1. **Login** (`/login`) — Privy, **Continue with X** (no auto embedded wallet)
2. **Console** (`/console`) — post-login dashboard
   - Paste X Money pay / transfer link or QR screenshot
   - Bind handle for agent harnesses
   - x402 dry-run panel
   - Harness picker (Grok Build, Hermes, Claude, custom)
3. **Augments** / **E𝕏hibit** — marketplace + submission surface

## Relationship to the plugin

| Path | Role |
|------|------|
| Repo root (`src/`, `skills/`, `scripts/`) | Agent plugin — wallet + JTX gate, dry-run CLI, no Privy |
| **`apps/web`** | Browser dashboard — Privy X login, pay-link UI, agent-facing copy |

Agents still clone **this whole repo** and run `npm run setup` / `npm run dry-run` at root.  
Humans use **xwealth.space** after X login.

## Source fold

UI was scaffolded in Grok Build and temporarily published as `jettoptx/xwealth`.  
**Fold target is this directory.** Until the full tree is copied here:

```bash
# from a machine with both clones
git clone https://github.com/jettoptx/jettoptx-xwealth.git
git clone https://github.com/jettoptx/xwealth.git
# copy UI into monorepo (example)
rsync -a --exclude node_modules --exclude .git xwealth/ jettoptx-xwealth/apps/web/
cd jettoptx-xwealth
# then wire Vercel root to apps/web OR keep separate deploy from apps/web
```

Privy fix already on `jettoptx/xwealth` main: `createOnLogin: "off"` (stops “Creating your wallet…” loop).

## Deploy

- Domain: **xwealth.space**
- Vercel project: connect **jettoptx/jettoptx-xwealth** with root **`apps/web`** (once tree is present), or keep deploying from folded UI until monorepo is complete
- Env:
  ```
  VITE_PRIVY_APP_ID=cmoq24szk00by0dl5abm0ss19
  VITE_PRIVY_ENABLED=true
  ```

## Local

```bash
cd apps/web   # after fold
npm install
npm run dev   # 0.0.0.0:8080 in Grok Build; Vite default elsewhere
```
