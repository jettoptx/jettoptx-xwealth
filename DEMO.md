# X Wealth — demo + dry-run (Augment-08 beta)

**Mode:** dry-run · **no LIVE** · **no Privy** · **SpacetimeDB not required**

## Where do I get the key file?

The **key file** is a Solana **keypair JSON** (secret key bytes). It is **optional for dry-run**. It is **required later for LIVE** (still blocked until settle ships).

| Goal | What you need |
|------|----------------|
| Dry-run today | **Pubkey only** → `SOLANA_WALLET` |
| LIVE later | Keypair file whose **pubkey matches** that wallet |

### Create a new keypair (Solana CLI)

```bash
# Install Solana CLI if needed: https://docs.solana.com/cli/install-solana-cli-tools
mkdir -p ~/.config/solana
solana-keygen new --outfile ~/.config/solana/xwealth-agent.json --no-bip39-passphrase
solana-keygen pubkey ~/.config/solana/xwealth-agent.json
# → that string is SOLANA_WALLET
```

**Windows (PowerShell):**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\solana" | Out-Null
solana-keygen new --outfile "$env:USERPROFILE\.config\solana\xwealth-agent.json" --no-bip39-passphrase
solana-keygen pubkey "$env:USERPROFILE\.config\solana\xwealth-agent.json"
```

Then fund **that pubkey** with ≥1 JTX (+ SOL for fees, USDC when you test rails).

```powershell
$env:SOLANA_WALLET = '<pubkey-from-solana-keygen>'
$env:XWEALTH_KEYPAIR = "$env:USERPROFILE\.config\solana\xwealth-agent.json"
```

### Already have a funded wallet?

- Export / recover the keypair **only on your machine** from the wallet that holds the funds (Phantom “export private key” → convert to Solana CLI JSON, or the original `id.json` you generated).
- Point `XWEALTH_KEYPAIR` at **that file path**.
- **Never** paste the secret into chat, GitHub, or the public repo.
- If a secret was pasted in chat, **treat it as burned** — make a **new** keypair and move funds.

### Default path the plugin may probe

`~/.config/solana/id.json` — only if it exists. If it is a **different** pubkey than `SOLANA_WALLET`, dry-run still **passes** with a **warning**; LIVE would fail match checks.

### Never commit

- `*.json` keypairs, `.env`, `XWEALTH_KEYPAIR` contents  
- See `.gitignore` (id.json, wallet.json, .env*, .xwealth*)

---

## 1) Plugin gate + tests

```powershell
$env:SOLANA_WALLET = '<pubkey-with-≥1-JTX>'
cd C:\Users\joshu\repos\jettoptx\jettoptx-xwealth
npm install
npm run setup    # exit 0 = ≥1 JTX
npm test         # 15 tests
```

## 2) Real dry-run (no money)

```powershell
cd C:\Users\joshu\repos\jettoptx\jettoptx-xwealth
$env:SOLANA_WALLET = '<pubkey-with-≥1-JTX>'
# optional:
# $env:XWEALTH_KEYPAIR = "$env:USERPROFILE\.config\solana\xwealth-agent.json"

npm run dry-run -- --to https://x.com/i/money/pay/JoshuaJett --amount 1
# expect: ok:true · live:false · settle:false · jtxGate.ok · blockers:[]

# LIVE always blocked:
npm run dry-run -- --to JoshuaJett --amount 1 --live
```

## 3) Local UI

```powershell
cd C:\Users\joshu\OPTX-windows\8-Wealth\xwealth-ui
npm run dev
# http://127.0.0.1:3001/
```

| Check | Expect |
|--------|--------|
| JTX gate | PASS · `/api/solana-rpc` |
| Paste/pay QR | `@handle` · CSS glass nest |
| x402 dry-run | UI only |

## Do not

- Paste private keys in chat  
- Commit key files  
- Claim LIVE / SpacetimeDB required for this beta path  
