# Agentcard for X Wealth agents

Any coding agent that clones **jettoptx-xwealth** can provision virtual cards + MCP via [Agentcard](https://agentcard.sh) (`npx agent-cards`).

## Fee treasury (canonical)

| Role | Address |
|------|---------|
| **Collection fees / X API markup** | `9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7` |
| Type | OPTX **Squads vault** (multisig thr≈2) |
| Asset | Prefer **USDC** (Solana mint below) |

```bash
export FEE_RECEIVER_SOLANA=9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7
```

Hosted X API proxy should send metered fees here so app `32724640` credit burn is offset. Do **not** use a single hot key for treasury.

## Default crypto rails (OPTX policy)

| Prefer | Chain | Asset | Notes |
|--------|--------|--------|--------|
| **Default settlement** | **Solana** or **Base** | **USDC** | Fiat ↔ crypto conversion defaults to USDC |
| Solana USDC mint | Solana | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Same ecosystem as JTX gate |
| Base USDC | Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Agentcard `withdraw --to <0x…>` |
| **Fee receiver** | Solana | `9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7` | Squads vault |

- **Do not** invent random stablecoins. Convert / cash-out path is **USDC** on **Solana** or **Base** unless the operator overrides in session.
- Agentcard native withdraw-to-crypto today: **USDC on Base** (`agent-cards withdraw --amount N --to 0x…`).
- Solana USDC for X Wealth / AARON / JTX-adjacent rails uses the mint above via your wallet tooling — keep amounts in **USD units** when talking to Agentcard cards.

## One-shot for agents (after clone)

```bash
cd jettoptx-xwealth
npm run agent-cards:setup
```

That installs skills, prints MCP snippets, and reminds about the companies wizard.

### Companies wizard (OAuth app + MCP into this repo)

Requires a human Agentcard login once:

```bash
# Interactive
npx agent-cards login --email you@jettoptics.ai
# finish with emailed code
npx agent-cards login --email you@jettoptics.ai --code <code>

# Wire X Wealth as a company app (UI default port 3001)
npx agent-cards companies wizard --agent --yes \
  --path . \
  --app-name "X Wealth" \
  --app-url http://localhost:3001
```

Windows PowerShell:

```powershell
npx agent-cards companies wizard --agent --yes `
  --path . `
  --app-name "X Wealth" `
  --app-url http://localhost:3001
```

Machine-readable last line: `AGENTCARD_WIZARD_RESULT {"ok":true,...}`  
Exit `2` = need `--email` / `--code` / `--org` / consent — re-run with the hint.

### Personal MCP (Claude / local agents)

```bash
npx agent-cards setup-mcp
# or install skill + manual config below
npx agent-cards api skill install mcp-server
npx agent-cards api skill install agent-card
```

## MCP configs (copy)

### Claude Code / Cursor style (`mcp.json`)

See [`mcp.agent-cards.example.json`](./mcp.agent-cards.example.json).

### Grok Build (`~/.grok/config.toml` fragment)

```toml
[mcp_servers.agent-cards]
command = "npx"
args = ["-y", "agent-cards", "mcp"]
# After login, session lives in user home; or set:
# env = { AGENT_CARDS_JWT = "..." }
```

### Hermes Desktop

Add under profile MCP servers (stdio):

```yaml
agent-cards:
  command: npx
  args: ["-y", "agent-cards", "mcp"]
```

Confirm the MCP entrypoint with:

```bash
npx agent-cards api tools
npx agent-cards --help
```

If `mcp` is not a top-level command in your CLI version, use the skill in `.agents/skills/mcp-server/` and the tools catalog:

```bash
npx agent-cards api call whoami '{}'
```

## Safety

- Cards are **live money**. Never `create_card` / `withdraw` / checkout without human **confirm**.
- X Wealth product gate remains **≥1 JTX** on the Solana wallet (`npm run setup`).
- Agentcard is **spend rails**, not a replacement for the JTX gate.

## Related

- Skill: `skills/xwealth/SKILL.md`
- Agentcard skills (installed under `.agents/skills/`): `agent-card`, `mcp-server`
- Crypto policy: [`crypto-rails.json`](./crypto-rails.json)
