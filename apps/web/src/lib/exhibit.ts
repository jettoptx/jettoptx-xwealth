/** Exhibit constants — public-facing only (no local paths). */

export const EXHIBIT = {
  title: 'X Wealth',
  subtitle: 'Augment-08 · agentic pay surface',
  host: 'wealth.astroknots.space',
  jtxMint: 'JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe',
  mintShort: 'JTXGnx…joe',
  feeTreasury: '9WssADzftzptNnMHLzPZYAFApUfE7qLYChicH1Wh6YD7',
  pluginRepo: 'https://github.com/jettoptx/jettoptx-xwealth',
  agentsHub: 'https://jtx.astroknots.space/agents',
  jettoptics: 'https://jettoptics.ai',
  jtxChat: 'https://www.jtx.chat',
  jtxTrade: 'https://jtx.com/?ref=Jett',
  canvasui: 'https://canvasui.dev/components',
  hermes: 'https://github.com/NousResearch/hermes-agent',
  nous: 'https://nousresearch.com',
  grok: 'https://x.ai',
  xDev: 'https://developer.x.com',
  solana: 'https://solana.com',
} as const

export type RailId = 'solana' | 'hermes' | 'xapi' | 'grok'

export const RAILS: {
  id: RailId
  label: string
  tag: string
  color: string
  border: string
  body: string
  link: string
  linkLabel: string
}[] = [
  {
    id: 'solana',
    label: 'Solana',
    tag: 'JTX ≥1 gate',
    color: 'text-[#14F195]',
    border: 'border-[#14F195]/35 bg-[#14F195]/10',
    body: 'Mainnet wallet + Token-2022 JTX balance. Same-origin RPC proxy. Gate opens dry-run wealth tools only.',
    link: EXHIBIT.solana,
    linkLabel: 'solana.com',
  },
  {
    id: 'hermes',
    label: 'Hermes',
    tag: 'agent harness',
    color: 'text-violet-300',
    border: 'border-violet-400/35 bg-violet-500/10',
    body: 'Desktop / CLI agent host. Install jettoptx-xwealth skill, run check-jtx, dry-run X Money intents without live settle.',
    link: EXHIBIT.pluginRepo,
    linkLabel: 'xwealth plugin',
  },
  {
    id: 'xapi',
    label: 'X API',
    tag: 'Money + OAuth',
    color: 'text-sky-300',
    border: 'border-sky-400/35 bg-sky-500/10',
    body: 'X Money pay/transfer links + QR decode. Optional Jett Optics X OAuth app for agent identity — no Privy.',
    link: EXHIBIT.xDev,
    linkLabel: 'developer.x.com',
  },
  {
    id: 'grok',
    label: 'Grok',
    tag: 'xAI tooling',
    color: 'text-amber-200',
    border: 'border-amber-400/35 bg-amber-500/10',
    body: 'Grok Build / multi-agent skills. Same graph as Hermes: gate → parse → dry-run. Marketplace-ready plugin install.',
    link: EXHIBIT.grok,
    linkLabel: 'x.ai',
  },
]

export function buildDryRunIntent(opts: {
  handle: string | null
  transferUrl: string | null
  kind: string | null
  wallet: string
  gateOk: boolean | null
  jtxAmount: number | null
}) {
  return {
    mode: 'dry-run' as const,
    live: false,
    settle: false,
    network: 'solana-mainnet',
    asset: 'JTX',
    gate: {
      ok: opts.gateOk,
      wallet: opts.wallet || null,
      jtxUi: opts.jtxAmount,
      minRequired: 1,
    },
    xMoney: {
      handle: opts.handle,
      kind: opts.kind,
      url: opts.transferUrl,
    },
    policy: 'LIVE blocked — exhibit / agent dry-run only',
    rails: ['solana', 'hermes', 'x-api', 'grok'],
    ts: new Date().toISOString(),
  }
}
