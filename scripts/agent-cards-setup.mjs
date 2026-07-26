#!/usr/bin/env node
/**
 * Bootstrap Agentcard for any agent that clones jettoptx-xwealth.
 * - Installs published skills into ./.agents/skills
 * - Prints crypto rails (USDC Solana/Base)
 * - Prints companies wizard + MCP next steps
 *
 * Does NOT spend money. Live cards require human login + confirm.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function run(args, opts = {}) {
  const r = spawnSync(npx, ['-y', 'agent-cards', ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
  })
  return r
}

console.log('=== X Wealth · Agentcard setup ===')
console.log('Crypto default: USDC on Solana or Base (see agent-cards/crypto-rails.json)')
console.log('')

const railsPath = join(root, 'agent-cards', 'crypto-rails.json')
if (existsSync(railsPath)) {
  const rails = JSON.parse(readFileSync(railsPath, 'utf8'))
  console.log(
    JSON.stringify(
      {
        default_conversion: rails.default_conversion,
        usdc_solana: rails.assets.USDC.solana.mint,
        usdc_base: rails.assets.USDC.base.address,
        jtx_gate: rails.assets.JTX.solana,
      },
      null,
      2,
    ),
  )
}

console.log('\n--- Install skills (agent-card, mcp-server) ---')
for (const skill of ['agent-card', 'mcp-server']) {
  const r = run(['api', 'skill', 'install', skill])
  const out = (r.stdout || r.stderr || '').trim()
  console.log(skill + ':', r.status === 0 ? 'ok' : out.slice(0, 200))
}

// Session check
const who = run(['api', 'call', 'whoami', '{}'])
const signedIn = who.status === 0 && !String(who.stdout || who.stderr).includes('not_signed_in')
console.log('\n--- Session ---')
if (signedIn) {
  console.log((who.stdout || '').slice(0, 500))
} else {
  console.log('Not signed in. Human must run:')
  console.log('  npx agent-cards login --email <you@domain>')
  console.log('  npx agent-cards login --email <you@domain> --code <code>')
}

console.log('\n--- Companies wizard (OAuth + MCP into this repo) ---')
console.log(`  cd ${root}`)
console.log(
  '  npx agent-cards companies wizard --agent --yes --app-name "X Wealth" --app-url http://localhost:3001',
)
console.log('  (add --email / --code / --org if exit 2)')

console.log('\n--- MCP ---')
console.log('  Example: agent-cards/mcp.agent-cards.example.json')
console.log('  Personal Claude: npx agent-cards setup-mcp')
console.log('  Tool catalog:   npx agent-cards api tools')

// Write a stamp for agents
const stampDir = join(root, '.agents')
mkdirSync(stampDir, { recursive: true })
writeFileSync(
  join(stampDir, 'agent-cards-setup.json'),
  JSON.stringify(
    {
      product: 'jettoptx-xwealth',
      at: new Date().toISOString(),
      cryptoDefault: 'USDC on Solana or Base',
      signedIn,
      next: signedIn
        ? 'npx agent-cards companies wizard --agent --yes --app-name "X Wealth" --app-url http://localhost:3001'
        : 'npx agent-cards login --email <email>',
    },
    null,
    2,
  ) + '\n',
)
console.log('\nWrote .agents/agent-cards-setup.json')
console.log('Done. No money moved.')
process.exit(0)
