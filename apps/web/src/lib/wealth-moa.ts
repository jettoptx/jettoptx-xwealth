/**
 * Wealth-08 MOA registry — nodes are live UI surfaces / harness plugs.
 * Visual language matches jettoptx-docs MOA (AGT colors + force graph).
 */

import { EXHIBIT } from './exhibit'

export type AgtKey = 'COG' | 'EMO' | 'ENV'

export type WealthNodeId =
  | 'wealth-08'
  | 'jtx-gate'
  | 'x-money'
  | 'dry-run'
  | 'solana'
  | 'hermes'
  | 'x-api'
  | 'grok'
  | 'agents-hub'
  | 'plugin'
  | 'canvas-ui'
  | 'treasury'

export type WealthNode = {
  id: WealthNodeId
  label: string
  digit?: string
  agt: AgtKey
  radius: number
  description: string
  subLabels: string[]
  /** Interactive panel kind */
  panel: 'hub' | 'gate' | 'pay' | 'intent' | 'rail' | 'link' | 'info'
  /** For rail / link panels */
  externalHref?: string
  plug?: string
  cog: number
  emo: number
  env: number
}

export type WealthEdge = { source: WealthNodeId; target: WealthNodeId }

export const AGT = {
  COG: { color: '#eab308', glow: 'rgba(234,179,8,0.4)', label: 'Cognitive' },
  EMO: { color: '#f43f5e', glow: 'rgba(244,63,94,0.4)', label: 'Emotional' },
  ENV: { color: '#60a5fa', glow: 'rgba(96,165,250,0.4)', label: 'Environmental' },
} as const

/** All exhibit surfaces as MOA nodes */
export const WEALTH_NODES: WealthNode[] = [
  {
    id: 'wealth-08',
    label: 'Wealth',
    digit: '08',
    agt: 'EMO',
    radius: 28,
    description:
      'Augment-08 hub. X Money + JTX gate + dry-run for agent harnesses. Cards plug into Hermes, Grok, Claude, Cursor.',
    subLabels: ['Augment-08', 'EMO', 'dry-run'],
    panel: 'hub',
    plug: 'npx skills add jettoptx/jettoptx-xwealth',
    cog: 25,
    emo: 55,
    env: 20,
  },
  {
    id: 'jtx-gate',
    label: 'JTX Gate',
    digit: '04',
    agt: 'COG',
    radius: 18,
    description:
      'Solana mainnet ≥1 JTX check via same-origin RPC. No Privy. Unlocks dry-run tools.',
    subLabels: ['Token-2022', 'RPC proxy', 'PASS/FAIL'],
    panel: 'gate',
    plug: 'npm run check-jtx',
    cog: 70,
    emo: 15,
    env: 15,
  },
  {
    id: 'x-money',
    label: 'X Money',
    digit: '02',
    agt: 'EMO',
    radius: 18,
    description:
      'Paste pay/transfer URL or load QR. Auto-crop + jsQR → handle + link. Glass pay card.',
    subLabels: ['QR decode', 'paste URL', 'glass card'],
    panel: 'pay',
    plug: 'parse_x_money',
    cog: 20,
    emo: 50,
    env: 30,
  },
  {
    id: 'dry-run',
    label: 'Dry-run',
    agt: 'COG',
    radius: 16,
    description:
      'Intent JSON for agents. LIVE always blocked on exhibit. Copy for Hermes / Grok.',
    subLabels: ['LIVE blocked', 'intent JSON', 'policy'],
    panel: 'intent',
    plug: 'npm run dry-run',
    cog: 60,
    emo: 25,
    env: 15,
  },
  {
    id: 'solana',
    label: 'Solana',
    agt: 'ENV',
    radius: 15,
    description:
      'Mainnet rail. JTX mint + treasury path. RPC health via /api/solana-rpc.',
    subLabels: ['mainnet', EXHIBIT.mintShort, 'USDC path'],
    panel: 'rail',
    externalHref: EXHIBIT.solana,
    plug: 'SOLANA_RPC_URL',
    cog: 30,
    emo: 10,
    env: 60,
  },
  {
    id: 'hermes',
    label: 'Hermes',
    agt: 'ENV',
    radius: 16,
    description:
      'Desktop agent harness. Install xwealth skill, check-jtx, dry-run. Same graph as Grok Build.',
    subLabels: ['skill install', 'check-jtx', 'astrojoe'],
    panel: 'rail',
    externalHref: EXHIBIT.pluginRepo,
    plug: 'npx skills add jettoptx/jettoptx-xwealth',
    cog: 35,
    emo: 20,
    env: 45,
  },
  {
    id: 'x-api',
    label: 'X API',
    agt: 'EMO',
    radius: 15,
    description:
      'X Money links + optional Jett Optics X OAuth app. No login wall on this surface.',
    subLabels: ['Money QR', 'OAuth optional', 'dev.x'],
    panel: 'rail',
    externalHref: EXHIBIT.xDev,
    plug: 'X_CLIENT_ID',
    cog: 25,
    emo: 45,
    env: 30,
  },
  {
    id: 'grok',
    label: 'Grok',
    agt: 'COG',
    radius: 16,
    description:
      'xAI / Grok Build multi-agent. Plugin install + dry-run graph. HEDGEHOG research lane.',
    subLabels: ['x.ai', 'skills', 'multi-agent'],
    panel: 'rail',
    externalHref: EXHIBIT.grok,
    plug: 'grok-build skill: xwealth',
    cog: 55,
    emo: 20,
    env: 25,
  },
  {
    id: 'agents-hub',
    label: 'Agents',
    agt: 'EMO',
    radius: 14,
    description:
      'jtx.astroknots.space/agents — x402 catalog + JOE storefront hub.',
    subLabels: ['x402', 'EMO', 'storefront', 'deeplink'],
    panel: 'link',
    externalHref: EXHIBIT.agentsHub,
    cog: 20,
    emo: 55,
    env: 25,
  },
  {
    id: 'plugin',
    label: 'Plugin',
    agt: 'COG',
    radius: 14,
    description:
      'Public jettoptx-xwealth — install on Hermes, Grok, Claude, Cursor, OpenClaw, Pi.',
    subLabels: ['github', 'skills.sh', 'no Privy'],
    panel: 'link',
    externalHref: EXHIBIT.pluginRepo,
    plug: 'npx skills add jettoptx/jettoptx-xwealth',
    cog: 50,
    emo: 20,
    env: 30,
  },
  {
    id: 'canvas-ui',
    label: 'Canvas UI',
    agt: 'ENV',
    radius: 13,
    description:
      'Laser · Asciify · Glass · Dithered JOE — creative canvas layer for the exhibit.',
    subLabels: ['dithered object', 'glass', 'laser'],
    panel: 'info',
    externalHref: EXHIBIT.canvasui,
    cog: 25,
    emo: 25,
    env: 50,
  },
  {
    id: 'treasury',
    label: 'Treasury',
    agt: 'COG',
    radius: 13,
    description:
      'OPTX Squads vault fee sink for metered X API / hosted rails. Read-only on exhibit.',
    subLabels: ['Squads', '9Wss…', 'fees'],
    panel: 'info',
    plug: `FEE_RECEIVER_SOLANA=${EXHIBIT.feeTreasury}`,
    cog: 65,
    emo: 15,
    env: 20,
  },
]

export const WEALTH_EDGES: WealthEdge[] = [
  { source: 'wealth-08', target: 'jtx-gate' },
  { source: 'wealth-08', target: 'x-money' },
  { source: 'wealth-08', target: 'dry-run' },
  { source: 'wealth-08', target: 'plugin' },
  { source: 'jtx-gate', target: 'solana' },
  { source: 'jtx-gate', target: 'dry-run' },
  { source: 'x-money', target: 'x-api' },
  { source: 'x-money', target: 'dry-run' },
  { source: 'dry-run', target: 'hermes' },
  { source: 'dry-run', target: 'grok' },
  { source: 'hermes', target: 'plugin' },
  { source: 'grok', target: 'plugin' },
  { source: 'wealth-08', target: 'agents-hub' },
  { source: 'agents-hub', target: 'x-api' },
  { source: 'wealth-08', target: 'canvas-ui' },
  { source: 'solana', target: 'treasury' },
  { source: 'dry-run', target: 'treasury' },
]

export function getConnections(nodeId: string): string[] {
  const ids = new Set<string>()
  for (const e of WEALTH_EDGES) {
    if (e.source === nodeId) ids.add(e.target)
    if (e.target === nodeId) ids.add(e.source)
  }
  return Array.from(ids)
}
