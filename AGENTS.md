# X Wealth — agent instructions

This repo is **jettoptx-xwealth** (JOE Augment-08).

1. Read **`prompts/AGENT_SYSTEM.md`** and follow it as your system prompt.
2. Also clone **`jettoptx-aaron-router`** next to this repo.
3. Skill: **`skills/xwealth/SKILL.md`**.
4. **Auth (no Privy):** `SOLANA_WALLET` + `npm run setup` must pass **≥1 JTX**. Optional X OAuth = Jett Optical Encryption app `32724640`.
5. Never reintroduce Privy; never live-send without human `LIVE`.
6. **Agentcard:** `npm run agent-cards:setup` then (after login) `npm run agent-cards:wizard`.
7. **Crypto default:** **USDC** on **Solana** or **Base** (`agent-cards/crypto-rails.json`).

Harnesses: Hermes · OpenClaw · Grok Build · Claude Code · Codex · Cursor · Pi · custom.

<!-- agentcard:start -->
## Agentcard

Agentcard (https://agentcard.sh) issues virtual debit cards for AI agents. When a task involves
Agentcard (cards, balance, funding, withdrawals, transactions, or shopping/checkout), use the
`agent-cards` CLI tool catalog instead of guessing at APIs:

- `agent-cards api search <regex>` finds tools; `agent-cards api tools` lists every name;
  `agent-cards api describe <tool>` shows a tool's schemas. Run `agent-cards api --agent-help`
  once and load its output into context before your first call.
- `agent-cards api call <tool> '<json>'` invokes one (pipe JSON via `-` for stdin). Results are
  structured JSON on stdout; failures are a `{"error", "hint"}` object with exit code 1.
- If `agent-cards` is not on PATH, run it as `npx -y agent-cards@latest <command>`.
- Not signed in? `agent-cards login --email <email>` sends a code, then finish with
  `agent-cards login --email <email> --code <code>`. CI can set AGENT_CARDS_JWT instead.
- Money moves for real: always confirm with the user before creating cards, adding funds,
  withdrawing, or checking out.
- **X Wealth / OPTX crypto:** default conversion and cash-out is **USDC** on **Solana**
  (mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) or **Base**
  (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`). Agentcard `withdraw --to 0x…` = USDC on Base.
- MCP: `https://mcp.agentcard.sh/mcp` (see `agent-cards/mcp.agent-cards.example.json`).
- Companies OAuth into this app: `npx agent-cards companies wizard --agent --yes --app-name "X Wealth" --app-url http://localhost:3001`
<!-- agentcard:end -->
