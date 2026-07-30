# X Wealth — agent instructions

This repo is **jettoptx-xwealth** (OPTX Augment-08).

**Continuing cloud/web work?** Start at **[docs/HANDOFF-CLOUDFLARE.md](./docs/HANDOFF-CLOUDFLARE.md)** (also `apps/web/docs/`).

1. Read **[INSTALL.md](./INSTALL.md)** and **[prompts/AGENT_SYSTEM.md](./prompts/AGENT_SYSTEM.md)**.  
2. Optional edge: clone **[jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router)** next to this repo.  
3. Skills: **`skills/xwealth/SKILL.md`**, paper trade MCP **`skills/jtx-trade-mcp/SKILL.md`** (`mcp/jtx-trade-paper/`, `npm run mcp:paper:smoke`).  
4. **Auth:** `SOLANA_WALLET` + `npm run setup` must pass **≥1 JTX**. Optional X OAuth via Jett Optical Encryption app. **No Privy.**  
5. Never live-send unless the human says **`LIVE`** and product supports it.  
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
