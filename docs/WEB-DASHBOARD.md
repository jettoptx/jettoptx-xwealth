# Web dashboard (post-login)

## Canonical naming

| Name | Use |
|------|-----|
| **jettoptx-xwealth** | Only public repo name for plugin + dashboard |
| **xwealth.space** | Only public product URL |
| `jettoptx/xwealth` | Temporary UI mirror — fold into `apps/web`, then archive |

## User flow

```text
https://xwealth.space
        │
        ▼
   /login  →  Continue with X (Privy)
        │
        ▼
   /console  ← post-login dashboard (this is the “old wealth app” surface)
        │
        ├── Pay link / QR → X Money handle
        ├── Agent harness cards
        ├── x402 dry-run
        └── Augments / E𝕏hibit
```

## What “fold” means

1. Keep **agent plugin** at repo root (unchanged dry-run / JTX gate / skills).
2. Put the **React console** under `apps/web` as the **post-login dashboard**.
3. Point Vercel **xwealth.space** at that web app.
4. Stop treating `jettoptx/xwealth` as a second product name.

## Auth

- **Web:** Privy X-first (E𝕏hibit). Do **not** auto-create embedded wallets on login.
- **Agents:** wallet + ≥1 JTX; optional X OAuth; no Privy in the plugin path.
