# X Wealth — agent instructions

This repo is **jettoptx-xwealth** (OPTX Augment-08).

**Continuing cloud/web work?** Start at **[docs/HANDOFF-CLOUDFLARE.md](./docs/HANDOFF-CLOUDFLARE.md)** (also `apps/web/docs/`).

1. Read **[INSTALL.md](./INSTALL.md)** and **[prompts/AGENT_SYSTEM.md](./prompts/AGENT_SYSTEM.md)**.  
2. Optional edge: clone **[jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router)** next to this repo.  
3. Skills: **`skills/xwealth/SKILL.md`**, paper trade MCP **`skills/jtx-trade-mcp/SKILL.md`** (`mcp/jtx-trade-paper/`, `npm run mcp:paper:smoke`), high-stakes **`skills/optx-high-stakes/SKILL.md`**.  
4. **Auth:** `SOLANA_WALLET` + `npm run setup` must pass **≥1 JTX**. Optional X OAuth via Jett Optical Encryption app. **No Privy.**  
5. Never live-send unless the human says **`LIVE`** and product supports it.  
5b. **LIVE high-stakes:** mint Aaron `approve_action` QR (`npm run high-stakes:mint`) → MOJO SEND-02 gaze — **never silent keypair autosign**. Docs: `docs/JOE-AUTO-SWARM-HIGH-STAKES.md`.  
6. **Crypto default:** USDC on Solana or Base (`agent-cards/crypto-rails.json`).  
7. **Agentcard** is **optional** third-party tooling — not required to install or demo.

Harnesses: Hermes · OpenClaw · Grok Build · Claude Code · Codex · Cursor · Pi · custom.

## Grok Build

```bash
grok plugin install jettoptx/jettoptx-xwealth --trust
```

See [GROK-PLUGIN.md](./GROK-PLUGIN.md).

## Safety

- No private keys in chat or git  
- Dry-run only until settle ships  
- Hosted X API fees → `FEE_RECEIVER_SOLANA` when proxy exists  

## Cursor Cloud specific instructions

The update script installs deps for all three components; this section only covers
non-obvious run/dev caveats. Standard commands live in `package.json` scripts,
`README.md`, `INSTALL.md`, and `apps/web/README.md`.

Three components:
- Root plugin `@jettoptx/xwealth` (Node/TS): `npm test` (runs `build` then
  `node --test`), `npm run dry-run -- --to <url|handle> --amount 1`.
- `apps/web` (the main product — Vite 8 + TanStack Start + React 19):
  `cd apps/web && npm run dev` serves on `0.0.0.0:8080` (http://localhost:8080).
  Lint `npm run lint`, types `npm run typecheck`, build `npm run build`.
- `mcp/jtx-trade-paper` (Python MCP): `npm run mcp:paper:smoke`.

Key caveats:
- **Auth to reach `/console` and `/settings` without credentials:** these routes
  are login-gated behind Privy, which is ON by default via a **hardcoded** app id
  in `src/lib/auth/privy.ts` (so `VITE_AUTH_ENABLED=false` alone is NOT enough —
  Privy short-circuits the user resolver). For local dev/preview of the
  authenticated console, run the dev server with BOTH flags:
  `VITE_PRIVY_ENABLED=false VITE_AUTH_ENABLED=false npm run dev`. That yields the
  built-in `DEV_USER` fallback and unlocks the console (X Money pay-link → QR flow).
  Real login instead needs Privy/X OAuth secrets (`VITE_PRIVY_APP_ID`, X app creds).
- **DB:** `apps/web` is dual-mode; with no `DATABASE_URL` it falls back to local
  **PGLite**, bootstrapped on dev-server start. No external DB is needed for dev.
- **Python MCP version pin:** `server.py` imports `mcp.server.fastmcp.FastMCP`,
  which the **2.x** `mcp` SDK removed. `requirements.txt` is pinned to `mcp<2`; if
  you reinstall, keep it in the 1.x line. The npm scripts call `python` (provided
  by `python-is-python3`).
- **Root plugin JTX gate:** `npm run setup` / `check-jtx` require a real
  `SOLANA_WALLET` holding ≥1 JTX plus Solana RPC network access. `npm run dry-run`
  works offline and correctly reports `ok:false` / blockers when no wallet is set —
  that is expected, not a failure.
- **Lint/typecheck:** the repo currently ships with pre-existing `eslint` errors and
  `tsc` type errors in `apps/web`. These are code issues, not environment problems;
  the dev server (Vite, no typecheck) runs regardless.
- **Playwright QA:** `apps/web/scripts/browser-smoke.mjs` needs the Chromium binary
  (`npx playwright install chromium`, from `apps/web`).
