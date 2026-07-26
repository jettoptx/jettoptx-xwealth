#!/usr/bin/env node
/**
 * Clone → run plugin setup:
 *   1) Resolve Solana wallet (env / ~/.xwealth/wallet.json / --wallet)
 *   2) Check ≥1 JTX v2 on that wallet (no Privy)
 *   3) Optionally note X OAuth client (Jett Optics app) for identity features
 *
 * Usage:
 *   npm run setup
 *   npm run setup -- --wallet <PUBKEY>
 *   SOLANA_WALLET=... npm run setup
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const X_CLIENT_ID =
  process.env.X_CLIENT_ID ||
  process.env.XWEALTH_X_CLIENT_ID ||
  'TFhKZW9KTmVxM3loTzd5ZEViVEU6MTpjaQ'

console.log('=== jettoptx-xwealth plugin setup ===')
console.log('Auth model: Solana wallet + JTX ≥1 gate (no Privy)')
console.log('X app (optional identity): Jett Optical Encryption client id set')
console.log('  X_CLIENT_ID =', X_CLIENT_ID.slice(0, 12) + '…')
console.log('')

// 1) wallet
const walletProc = spawnSync(process.execPath, [join(root, 'scripts/check-wallet.mjs')], {
  encoding: 'utf8',
  env: process.env,
})
let walletJson
try {
  walletJson = JSON.parse(walletProc.stdout || '{}')
} catch {
  walletJson = { ok: false, error: walletProc.stdout || walletProc.stderr }
}

if (!walletJson.ok) {
  console.error(JSON.stringify(walletJson, null, 2))
  console.error(`
Fix: export a pubkey then re-run setup:

  # PowerShell
  $env:SOLANA_WALLET = '<YOUR_SOLANA_PUBKEY>'
  npm run setup

  # or write config
  # ~/.xwealth/wallet.json  →  { "wallet": "<PUBKEY>" }
`)
  process.exit(2)
}

console.log('Wallet:', walletJson.wallet, `(${walletJson.source})`)

// 2) JTX gate
const gateProc = spawnSync(
  process.execPath,
  [join(root, 'scripts/check-jtx-gate.mjs'), '--wallet', walletJson.wallet],
  { encoding: 'utf8', env: process.env },
)
let gate
try {
  gate = JSON.parse(gateProc.stdout || '{}')
} catch {
  gate = { ok: false, error: gateProc.stdout || gateProc.stderr }
}

console.log(JSON.stringify(gate, null, 2))

// Persist session stub for agents (no secrets)
const dir = join(homedir(), '.xwealth')
mkdirSync(dir, { recursive: true })
const sessionPath = join(dir, 'session.json')
const session = {
  wallet: walletJson.wallet,
  walletSource: walletJson.source,
  jtxPass: !!gate.ok,
  jtxUiAmount: gate.uiAmount ?? null,
  mint: gate.mint || process.env.JTX_MINT,
  xClientId: X_CLIENT_ID,
  authModel: 'x-oauth-optional + solana-wallet + jtx-gate',
  privy: false,
  updatedAt: new Date().toISOString(),
}
writeFileSync(sessionPath, JSON.stringify(session, null, 2) + '\n')
console.log('Wrote', sessionPath)

if (!gate.ok) {
  console.error('\nPlugin LOCKED — need ≥1 JTX v2 in this wallet.')
  console.error('Mint: JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe')
  process.exit(1)
}

console.log('\nPlugin READY — dry-run tools unlocked for this wallet.')
console.log('Optional next: X OAuth (same Jett Optics app) for X-linked actions:')
console.log('  set X_BOOKMARKS_* / user tokens, or run Hermes x-operator oauth flow')
process.exit(0)
