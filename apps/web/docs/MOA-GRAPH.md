# Map of Augments (MoA)

Graph layer for **X Wealth** (`https://xwealth.space/augments`).

## Privacy default

| Surface | Public? |
|---------|---------|
| Node (handle + agent pay card) | Yes |
| Edge (`follow` / `delegate` / `paid`) | Yes |
| Amount | **No** — truncated (`amountPublic: null`) unless user opts into `public_full` |

Product truncation now. Later: Light Protocol compression via Helius; Token-2022 confidential transfers; Zama FHE (Solana H2 2026) — **do not block** on FHE.

## Infra lock

- **Helius** — primary Solana RPC  
- **Light Protocol** — compression / privacy direction (via Helius)  
- **QuickNode** — failover only  
- No Solang on core path · no new L1 / MindChain  

Do **not** put Helius API keys in the client.

## Types

See `src/lib/moa-graph.ts`:

- `MoaNode` — X-linked user + pay card  
- `MoaLink` — edge (`follow` | `delegate` | `paid`)  
- `MoaPublicProof` — `@payer → @payee · agent · settled` with optional truncated amount  

Persisted in Zustand (`moaLinks`, `moaProofs`) with seed edges around `@jettoptx`.

## NOTR / Buzz

`src/lib/notr-relay.ts`:

- `publishProofPublic` → local Zustand (map)  
- `publishDelegatePrivate` → stub (wire later to [jettoptx.chat Space Cowboys](https://www.jettoptx.chat/send?c=2))  

## UI

- `/augments` — **List | Map** toggle  
- Map: SVG nodes + edges (orange = paid/delegate)  
- Node click → Agent Pay Card (Link / Delegate + recent proofs + share line)  
- x402 REAL (and dry-run demo) → truncated proof + paid link + toast  

Share line:

```text
Space Cowboy proof · @payer → @payee paid agent via X Wealth x402 · https://xwealth.space/augments
```

## Canonical repos

| Repo | Role |
|------|------|
| [jettoptx/xwealth](https://github.com/jettoptx/xwealth) | Live UI deploy (xwealth.space) |
| [jettoptx/jettoptx-xwealth](https://github.com/jettoptx/jettoptx-xwealth) | Canonical plugin + fold target `apps/web` |
