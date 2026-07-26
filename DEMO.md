# Demo — dry-run only

## Keypair (optional)

Dry-run needs a **public** `SOLANA_WALLET` only.  
A local keypair file is **optional** and only for a future LIVE path (still blocked).

```bash
# Optional — Solana CLI
solana-keygen new --outfile ~/.config/solana/xwealth-agent.json --no-bip39-passphrase
export SOLANA_WALLET="$(solana-keygen pubkey ~/.config/solana/xwealth-agent.json)"
export XWEALTH_KEYPAIR="$HOME/.config/solana/xwealth-agent.json"
```

**PowerShell:**

```powershell
solana-keygen new --outfile "$env:USERPROFILE\.config\solana\xwealth-agent.json" --no-bip39-passphrase
$env:SOLANA_WALLET = (solana-keygen pubkey "$env:USERPROFILE\.config\solana\xwealth-agent.json")
$env:XWEALTH_KEYPAIR = "$env:USERPROFILE\.config\solana\xwealth-agent.json"
```

- Never commit keypair JSON  
- Never paste secrets into chat  
- If a secret was exposed, rotate and move funds  

Default probe path if unset: `~/.config/solana/id.json` (may warn if pubkey ≠ `SOLANA_WALLET`).

## Commands

```bash
cd /path/to/jettoptx-xwealth
export SOLANA_WALLET='<pubkey>'
npm install
npm run setup
npm test
npm run dry-run -- --to https://x.com/i/money/pay/demo_user --amount 1
```

LIVE is always rejected until settle ships:

```bash
npm run dry-run -- --to demo_user --amount 1 --live   # blocked
```

## UI

Production target: **https://wealth.astroknots.space** (when deployed).  
Local prototypes are out of this repo; see [INSTALL.md](./INSTALL.md).
