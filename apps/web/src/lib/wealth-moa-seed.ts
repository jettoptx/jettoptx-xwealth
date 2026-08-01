/**
 * Lean Wealth MOA seed — only nodes around Wealth-08 + Core deeplinks.
 */

import type { AgtKey } from './wealth-moa-store'

export type SeedNode = {
  id: string
  label: string
  agt: AgtKey
  radius: number
  description: string
  subLabels: string[]
  tool?:
    | 'hub'
    | 'gate'
    | 'pay'
    | 'intent'
    | 'plugin'
    | 'agents'
    | 'link'
    /** Augment marketplace graph (X OAuth graph mode) */
    | 'market-hub'
    | 'market-oauth'
    | 'market-you'
    | 'market-pay'
    | 'market-skills'
    | 'market-skill'
    | 'market-peer'
  /** Open external site (leave this app) */
  href?: string
  custom: boolean
  harness?: string
}

/**
 * Graph topology:
 *
 *   JTX.chat (blue) ──┐
 *                     ├── Core-00 (orange) ── Wealth-08 ── tools/device
 *   JTX.trade (yellow)┘
 */
export const SEED_AUGMENTS: SeedNode[] = [
  {
    id: '0-core',
    label: 'Core-00',
    agt: 'ROOT',
    radius: 32,
    description:
      'Orange identity hub. Bridges Wealth to JTX.chat (DOJO) and JTX.trade.',
    subLabels: ['identity', 'orange'],
    custom: false,
  },
  {
    id: 'link-jtx-chat',
    label: 'JTX.chat',
    agt: 'ENV',
    radius: 22,
    description: 'DOJO / JettChat — leaves this app for the chat + DOJO surface.',
    subLabels: ['DOJO', 'deeplink'],
    tool: 'link',
    href: 'https://www.jtx.chat',
    custom: false,
  },
  {
    id: 'link-jtx-trade',
    label: 'JTX.trade',
    agt: 'COG',
    radius: 22,
    description: 'Trade dapp — leaves this app for jtx.com (ref=Jett).',
    subLabels: ['trade', 'deeplink'],
    tool: 'link',
    href: 'https://jtx.com/?ref=Jett',
    custom: false,
  },
  {
    id: '8-wealth',
    label: 'Wealth-08',
    agt: 'EMO',
    radius: 28,
    description:
      'This host. X Money + JTX gate + dry-run. Plug cards into the agent harness on your device.',
    subLabels: ['dry-run', 'JTX', 'purple hub'],
    tool: 'hub',
    custom: false,
  },
]

/** Wealth hub fill — purple (not EMO red) */
export const WEALTH_PURPLE = '#a855f7'
export const WEALTH_PURPLE_GLOW = 'rgba(168,85,247,0.42)'

/** Tools surrounding Wealth only */
export const WEALTH_TOOLS: SeedNode[] = [
  {
    id: '4-shield',
    label: 'JTX Gate',
    agt: 'COG',
    radius: 20,
    description: 'Solana mainnet ≥1 JTX check. No Privy.',
    subLabels: ['gate', 'RPC'],
    tool: 'gate',
    custom: false,
  },
  {
    id: '2-send',
    label: 'X Money',
    agt: 'EMO',
    radius: 20,
    description:
      'Special: Agentic pay card + Augment marketplace. OAuth with X → your @handle becomes a marketplace node. Toggle the X icon (top bar) to wipe this MOA and open the market graph.',
    subLabels: ['QR', 'OAuth', 'marketplace'],
    tool: 'pay',
    custom: false,
  },
  {
    id: 'tool-dry-run',
    label: 'DryRun',
    agt: 'COG',
    radius: 16,
    description: 'Intent JSON for harness. LIVE blocked.',
    subLabels: ['policy', 'JSON'],
    tool: 'intent',
    custom: false,
  },
  {
    id: 'tool-plugin',
    label: 'Plugin',
    agt: 'ENV',
    radius: 16,
    description: 'Install jettoptx-xwealth on Hermes / Grok / Claude / Cursor.',
    subLabels: ['skills', 'install'],
    tool: 'plugin',
    custom: false,
  },
  {
    id: 'tool-agents',
    label: 'Agents',
    agt: 'EMO',
    radius: 15,
    description: 'jtx.astroknots.space/agents · x402 hub.',
    subLabels: ['x402', 'EMO', 'hub'],
    tool: 'agents',
    href: 'https://jtx.astroknots.space/agents',
    custom: false,
  },
]

export function inferEdges(
  ids: string[],
  custom: { id: string; connectTo: string }[],
  deviceId: string,
): { source: string; target: string }[] {
  const set = new Set(ids)
  const edges: { source: string; target: string }[] = []
  const add = (a: string, b: string) => {
    if (set.has(a) && set.has(b) && a !== b) edges.push({ source: a, target: b })
  }

  // Core orange hub — exactly 3 named connections
  add('0-core', '8-wealth')
  add('0-core', 'link-jtx-chat')
  add('0-core', 'link-jtx-trade')

  // Wealth cluster
  add('8-wealth', '4-shield')
  add('8-wealth', '2-send')
  add('8-wealth', 'tool-dry-run')
  add('8-wealth', 'tool-plugin')
  add('8-wealth', 'tool-agents')
  add('4-shield', 'tool-dry-run')
  add('2-send', 'tool-dry-run')

  // Device bus
  add('8-wealth', deviceId)
  add(deviceId, 'tool-plugin')

  for (const c of custom) {
    const target = set.has(c.connectTo) ? c.connectTo : deviceId
    add(c.id, target)
    if (c.id.startsWith('harness-') || c.connectTo === deviceId) {
      add(c.id, deviceId)
    }
  }

  const seen = new Set<string>()
  return edges.filter((e) => {
    const k = [e.source, e.target].sort().join('|')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
