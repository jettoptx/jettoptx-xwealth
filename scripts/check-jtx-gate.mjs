#!/usr/bin/env node
/**
 * Programmatic JTX gate for agent harnesses (Hermes / Grok / Claude / Cursor).
 * No Privy login — uses Solana RPC + wallet pubkey (or keypair path for address only).
 *
 * Usage:
 *   node scripts/check-jtx-gate.mjs
 *   node scripts/check-jtx-gate.mjs --wallet <PUBKEY>
 *   SOLANA_WALLET=... SOLANA_RPC_URL=... node scripts/check-jtx-gate.mjs
 *
 * Env:
 *   SOLANA_WALLET or XWEALTH_WALLET   — base58 pubkey
 *   SOLANA_RPC_URL                    — default mainnet-beta public
 *   JTX_MINT                          — default canonical JTX v2
 *
 * Exit codes: 0 = pass (≥1 JTX), 1 = fail, 2 = usage/error
 */

import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const JTX_MINT =
  process.env.JTX_MINT || 'JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe'
const RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.XWEALTH_RPC ||
  'https://api.mainnet-beta.solana.com'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : null
}

function walletFromKeypairPath(path) {
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    // Only extract pubkey if solana-keygen style array — agents often have pubkey file
    if (Array.isArray(raw) && raw.length >= 32) {
      // Need @solana/web3.js for secret→public; keep optional
      return null
    }
    if (raw.pubkey || raw.address) return raw.pubkey || raw.address
  } catch {
    /* ignore */
  }
  return null
}

function resolveWallet() {
  const fromArg = arg('--wallet')
  if (fromArg) return fromArg.trim()
  const env =
    process.env.SOLANA_WALLET ||
    process.env.XWEALTH_WALLET ||
    process.env.VITE_SOLANA_WALLET
  if (env) return env.trim()
  // Common agent config drop-in
  const cfg = join(homedir(), '.xwealth', 'wallet.json')
  const fromCfg = walletFromKeypairPath(cfg)
  if (fromCfg) return fromCfg
  return null
}

async function checkJtx(wallet) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        wallet,
        { mint: JTX_MINT },
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ],
    }),
  })
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'RPC error')
  let ui = 0
  for (const a of json.result?.value || []) {
    const ta = a.account?.data?.parsed?.info?.tokenAmount
    if (ta?.uiAmount != null) ui += ta.uiAmount
  }
  return ui
}

const wallet = resolveWallet()
if (!wallet) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error:
          'No wallet. Set SOLANA_WALLET or pass --wallet <PUBKEY>. Optional: ~/.xwealth/wallet.json',
      },
      null,
      2,
    ),
  )
  process.exit(2)
}

try {
  const uiAmount = await checkJtx(wallet)
  const ok = uiAmount >= 1
  const out = {
    ok,
    wallet,
    mint: JTX_MINT,
    uiAmount,
    minRequired: 1,
    rpc: RPC,
    message: ok
      ? 'JTX gate PASS — agent may use X Wealth dry-run tools'
      : `JTX gate FAIL — need ≥1 JTX (have ${uiAmount})`,
  }
  console.log(JSON.stringify(out, null, 2))
  process.exit(ok ? 0 : 1)
} catch (e) {
  console.error(
    JSON.stringify(
      { ok: false, wallet, mint: JTX_MINT, rpc: RPC, error: String(e.message || e) },
      null,
      2,
    ),
  )
  process.exit(2)
}
