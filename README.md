# jettoptx-xwealth

**Agentic X Money wallet plugin for the OPTX ecosystem**

Graph-compatible nodes that let any agent harness (Hermes, OpenClaw, Claw, or custom) manage Solana wallets, verify JTX v2 token gates, and execute X Money peer-to-peer payments — all from the terminal.

## Core Features

- **JTX v2 Token Gate** — Requires holding ≥1 JTX v2 (`JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe`) for access
- **X OAuth** — Uses the official Jet Optics Twitter/X app for secure authentication
- **X Money Transfer Links** — Ingests `https://x.com/i/money/transfer/{handle}` or QR codes via Grok vision / multimodal
- **Graph Nodes** — Drop-in nodes for decision → payout wiring in any agent graph
- **Aeron / Elus Secure RPC** — Device-side router + compressed ethereal registration for end-to-end signing
- **Hedgehog MCP Ready** — Compatible with OPTX MCP tools for swarm orchestration

## Quick Start

```bash
npm install @jettoptx/xwealth
# or
pnpm add @jettoptx/xwealth
```

```ts
import { XWealthPlugin } from "@jettoptx/xwealth";

const plugin = new XWealthPlugin({
  jtxMint: "JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe",
  rpc: "https://your-elus-rpc",
});

// Graph node example
const payoutNode = plugin.createPayoutNode({
  recipientHandle: "JoshuaJett", // or resolved from transfer link / QR
  amount: 5.0,
  currency: "USD", // X Money
});
```

## Architecture (High Level)

```
Agent Decision Node
        ↓
   JTX Gate Check  ←── Solana RPC / Aeron Router
        ↓
  X OAuth Session  ←── Jet Optics X App
        ↓
 X Money Transfer  ←── /i/money/transfer/{handle} or QR ingest
        ↓
   Signed Payout
```

## Status

Scaffold only. Core implementation in progress.

- [x] Repo + README
- [ ] TypeScript package structure
- [ ] Auth + JTX verification modules
- [ ] Graph node definitions (Hermes / OpenClaw compatible)
- [ ] X Money transfer resolver
- [ ] QR / multimodal ingest helpers
- [ ] Hedgehog MCP tool bindings

## Official CA (JTX v2)

```
JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe
```

## Related

- [jettoptx-docs](https://github.com/jettoptx/jettoptx-docs)
- [jettoptx-aaron-router](https://github.com/jettoptx/jettoptx-aaron-router)
- Live docs: https://jettoptx.dev/docs

MIT License — Jett Optics / OPTX
