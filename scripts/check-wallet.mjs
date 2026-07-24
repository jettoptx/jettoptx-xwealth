#!/usr/bin/env node
/**
 * Resolve agent Solana wallet pubkey for harness side-projects.
 * Prints JSON { ok, wallet, source }.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : null
}

const candidates = [
  { source: 'flag', value: arg('--wallet') },
  { source: 'SOLANA_WALLET', value: process.env.SOLANA_WALLET },
  { source: 'XWEALTH_WALLET', value: process.env.XWEALTH_WALLET },
  { source: 'VITE_SOLANA_WALLET', value: process.env.VITE_SOLANA_WALLET },
]

for (const c of candidates) {
  if (c.value?.trim()) {
    console.log(
      JSON.stringify({ ok: true, wallet: c.value.trim(), source: c.source }, null, 2),
    )
    process.exit(0)
  }
}

const cfg = join(homedir(), '.xwealth', 'wallet.json')
if (existsSync(cfg)) {
  try {
    const j = JSON.parse(readFileSync(cfg, 'utf8'))
    const w = j.wallet || j.address || j.pubkey
    if (w) {
      console.log(
        JSON.stringify({ ok: true, wallet: w, source: '~/.xwealth/wallet.json' }, null, 2),
      )
      process.exit(0)
    }
  } catch {
    /* fall through */
  }
}

console.log(
  JSON.stringify(
    {
      ok: false,
      wallet: null,
      source: null,
      error:
        'No Solana wallet configured for agent. Export SOLANA_WALLET=<pubkey> or write ~/.xwealth/wallet.json {"wallet":"..."}',
    },
    null,
    2,
  ),
)
process.exit(1)
