/**
 * Local-first Wealth MOA persistence (same pattern as Warp custom nodes).
 * Custom nodes + harness bindings survive refresh on this device.
 */

export type AgtKey = 'COG' | 'EMO' | 'ENV' | 'ROOT'

export type CustomWealthNode = {
  id: string
  name: string
  description: string
  tensor: Exclude<AgtKey, 'ROOT'>
  /** Edge target: augment id, wealth tool id, or device-local */
  connectTo: string
  /** What this node plugs into on the agent device */
  harness: 'hermes' | 'grok' | 'claude' | 'cursor' | 'openclaw' | 'browser' | 'other'
  plug?: string
  createdAt: string
}

export type HarnessBinding = {
  harness: CustomWealthNode['harness']
  label: string
  wired: boolean
  note?: string
  updatedAt: string
}

const LS_CUSTOM = 'wealth-moa-custom-nodes'
const LS_HARNESS = 'wealth-moa-harness-bindings'
const LS_WALLET = 'wealth-moa-wallet'

export function loadCustomNodes(): CustomWealthNode[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM)
    if (!raw) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

export function saveCustomNodes(nodes: CustomWealthNode[]) {
  localStorage.setItem(LS_CUSTOM, JSON.stringify(nodes))
  window.dispatchEvent(new CustomEvent('wealth-moa-updated'))
}

export function loadHarnessBindings(): HarnessBinding[] {
  try {
    const raw = localStorage.getItem(LS_HARNESS)
    if (!raw) return defaultHarnessBindings()
    const p = JSON.parse(raw)
    return Array.isArray(p) && p.length ? p : defaultHarnessBindings()
  } catch {
    return defaultHarnessBindings()
  }
}

export function saveHarnessBindings(b: HarnessBinding[]) {
  localStorage.setItem(LS_HARNESS, JSON.stringify(b))
  window.dispatchEvent(new CustomEvent('wealth-moa-updated'))
}

export function defaultHarnessBindings(): HarnessBinding[] {
  return [
    {
      harness: 'browser',
      label: 'This browser',
      wired: true,
      note: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 64) : 'browser',
      updatedAt: new Date().toISOString(),
    },
    {
      harness: 'hermes',
      label: 'Hermes Desktop',
      wired: false,
      note: 'skill: jettoptx-xwealth',
      updatedAt: new Date().toISOString(),
    },
    {
      harness: 'grok',
      label: 'Grok Build',
      wired: false,
      note: 'skill: xwealth',
      updatedAt: new Date().toISOString(),
    },
    {
      harness: 'claude',
      label: 'Claude Code',
      wired: false,
      updatedAt: new Date().toISOString(),
    },
    {
      harness: 'cursor',
      label: 'Cursor',
      wired: false,
      updatedAt: new Date().toISOString(),
    },
  ]
}

/** Probe this device for agent-ish signals (local-first, no secrets). */
export function probeDevice(): {
  id: string
  label: string
  platform: string
  online: boolean
  language: string
  walletHint: string | null
} {
  const platform =
    typeof navigator !== 'undefined'
      ? `${navigator.platform || 'web'} · ${navigator.language || ''}`
      : 'unknown'
  let walletHint: string | null = null
  try {
    walletHint = localStorage.getItem(LS_WALLET) || localStorage.getItem('VITE_SOLANA_WALLET')
  } catch {
    /* ignore */
  }
  const short =
    typeof navigator !== 'undefined'
      ? (navigator.platform || 'Device').slice(0, 18)
      : 'Device'
  return {
    id: 'device-local',
    label: short || 'Device',
    platform,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    walletHint,
  }
}

export function saveWalletHint(pubkey: string) {
  try {
    localStorage.setItem(LS_WALLET, pubkey.trim())
  } catch {
    /* ignore */
  }
}

export function markHarnessWired(harness: CustomWealthNode['harness'], note?: string) {
  const list = loadHarnessBindings()
  const next = list.map((h) =>
    h.harness === harness
      ? { ...h, wired: true, note: note ?? h.note, updatedAt: new Date().toISOString() }
      : h,
  )
  // ensure entry exists
  if (!next.some((h) => h.harness === harness)) {
    next.push({
      harness,
      label: harness,
      wired: true,
      note,
      updatedAt: new Date().toISOString(),
    })
  }
  saveHarnessBindings(next)
}
