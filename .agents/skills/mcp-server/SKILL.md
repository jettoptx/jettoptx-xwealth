---
name: mcp-server
description: >
  Wire Agentcard MCP into Hermes / Grok / Claude / Cursor for X Wealth agents.
  Virtual cards + balance tools via MCP or `agent-cards api`. Default crypto
  cash-out for OPTX is USDC on Solana or Base.
---

# Agentcard MCP (X Wealth)

## Prefer (remote MCP)

```json
{
  "mcpServers": {
    "agent-cards": {
      "url": "https://mcp.agentcard.sh/mcp"
    }
  }
}
```

Docs skill expects tools prefixed `mcp__agent-cards__*`. Restart the agent session after adding MCP.

## CLI fallback (no MCP session)

```bash
npx -y agent-cards api tools
npx -y agent-cards api call whoami '{}'
npx -y agent-cards setup-mcp   # Claude Code local config
```

## Companies wizard (app OAuth for this repo)

```bash
npx agent-cards companies wizard --agent --yes \
  --app-name "X Wealth" \
  --app-url http://localhost:3001
```

## Crypto default (OPTX / X Wealth)

- Convert / settle as **USDC** on **Solana** or **Base**
- See `agent-cards/crypto-rails.json`
- Agentcard `withdraw` to crypto = **USDC on Base** (`--to 0x…`)

## Safety

Never create cards, withdraw, or checkout without explicit human confirmation.
