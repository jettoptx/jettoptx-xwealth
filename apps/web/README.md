# X Wealth — web product (`apps/web`)

**Live:** https://xwealth.space  
**Canonical repo:** [jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth) (`apps/web`)

Public X Wealth surface: landing, login (Privy), Map of Augments / marketplace
(`/augments`), pay console, WARP/MOA, x402 dry-run, and Web4 SEO.

## Architecture

| Layer | Location | Role |
|-------|----------|------|
| **Web** (this package) | `apps/web` in [jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth) | Public web product · xwealth.space |
| **Agent plugin** | repo root | Skills · dry-run CLI · JTX ≥1 gate · **no Privy** |

After **Continue with X**, users land on `/console`. From Dashboard they can open:

- **Augments** — marketplace / map
- **DOJO / WARP** — prototype surfaces
- **Agent plugin** — install/use the repo root for Hermes / Grok / harnesses

## Auth split

| Surface | Auth |
|---------|------|
| **This web shell** | Privy · X-first · optional Google/Apple/GitHub/wallet |
| **Agent plugin** | Solana wallet + **JTX ≥ 1** · optional X OAuth · **no Privy** |

## Dev

```bash
# from repo root
cd apps/web
npm install
npm run dev   # http://localhost:8080
```

Env: see `.env.example` (`VITE_PRIVY_APP_ID`, `TINYFISH_API_KEY`, …).

## Deploy

Vercel project **xwealth-ui** · production branch `main` · domains:

- https://xwealth.space  
- https://www.xwealth.space  

## Privy

`createOnLogin` is **off** so login does not hang on “Creating your wallet…”.
