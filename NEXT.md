# NEXT — X Wealth (agent prompt)

Copy/paste for Hermes / Grok Build / any agent continuing this work.

---

## Context

- Repo: `jettoptx/jettoptx-xwealth` (Augment-08 beta / dry-run).
- **No Privy. No SpacetimeDB required** for gate, QR/link parse, UI, or dry-run.
- UI prototype: `OPTX-windows/8-Wealth/xwealth-ui` → http://127.0.0.1:3001/
- Secrets: never commit or paste private keys. Use `SOLANA_WALLET` (pubkey) + optional `XWEALTH_KEYPAIR` (local file path only).
- LIVE settle (USDC→X Money) is **not shipped**. `npm run dry-run -- --live` must stay blocked.

## Done already

- JTX gate CLI + browser proxy `/api/solana-rpc`
- `parseMoneyLink` for `/pay/` and `/transfer/`
- `runDryRun` + `npm run dry-run` intent JSON (`ok`, blockers, warnings)
- Local signer **inspect** via keypair path (pubkey only in output)
- Unit tests (`npm test` — 15)
- DEMO.md key-file + dry-run instructions
- Hardened `.gitignore`

## Your task (priority order)

1. **Confirm dry-run green**  
   `SOLANA_WALLET=<pubkey> npm run setup && npm test && npm run dry-run -- --to https://x.com/i/money/pay/<handle> --amount 1`  
   Expect `ok: true`, `live: false`, `settle: false`.

2. **Keypair hygiene (operator)**  
   If signer warning (mismatched default `id.json`): document using a dedicated `xwealth-agent.json` whose pubkey == `SOLANA_WALLET`. Do not write secrets into the repo.

3. **Optional polish**  
   - CLI exit code: ignore Windows libuv teardown noise; ensure `process.exit(intent.ok?0:1)` after flush.  
   - README remaining “clone both repos / STDB sole DB” leftovers → align with “STDB optional”.  
   - UI: wire “x402 dry-run” button to call same intent shape (still no chain).

4. **Do not implement yet unless human says LIVE + settle design**  
   - Real USDC transfer / X Money API settle  
   - Publishing secrets, STDB as hard dependency, Privy  

5. **Ship hygiene**  
   Commit only source/docs/tests — no `.env`, keypairs, session dumps, or personal pubkeys required in tree.

## Success criteria

- [ ] `npm test` pass  
- [ ] `npm run dry-run` → `ok: true` with real JTX gate  
- [ ] LIVE path still blocked  
- [ ] No secrets in git status  
- [ ] DEMO.md / README tell operators how to create key file safely  

## Commands cheat sheet

```bash
export SOLANA_WALLET='<pubkey>'
# optional: export XWEALTH_KEYPAIR="$HOME/.config/solana/xwealth-agent.json"
npm install && npm run setup && npm test
npm run dry-run -- --to https://x.com/i/money/pay/JoshuaJett --amount 1
```
