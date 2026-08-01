/**
 * X Wealth Augment Marketplace
 *
 * Graph mode (toggle next to X icon):
 *  - Off  → classic Wealth-08 MOA (tools, device, harness)
 *  - On   → wiped MOA · marketplace MDX graph of users + agentic pay cards + skills
 *
 * Auth: Jett Optics Privy app (X OAuth modal). Session stores @handle from
 * Privy `user.twitter` after successful OAuth.
 */

import type { AgtKey } from './wealth-moa-store'
import type { SeedNode } from './wealth-moa-seed'

export const LS_X_SESSION = 'xwealth-x-session'
export const LS_MARKET_SKILLS = 'xwealth-market-skills'
export const LS_MARKET_MODE = 'xwealth-market-mode'
/** VIBE-05 social edges: you → peer invites from /augments right-click */
export const LS_VIBE_INVITES = 'xwealth-vibe-invites'
/** Marketplace nodes the user removed from the graph (local only) */
export const LS_HIDDEN_MARKET_NODES = 'xwealth-hidden-market-nodes'

export type XSession = {
  handle: string
  displayName?: string
  userId?: string
  signedInAt: string
  /** privy-x = Jett Optics Privy X OAuth; oauth-stub = legacy local only */
  method: 'oauth-stub' | 'x-oauth' | 'privy-x'
}

export type MarketSkill = {
  id: string
  name: string
  blurb: string
  /** Owner X handle without @ */
  owner: string
  listedAt: string
}

/** Other people who already added X Wealth augment (demo seed until SpacetimeDB). */
export type MarketPeer = {
  handle: string
  skillCount: number
  note: string
}

export const MARKET_PEERS: MarketPeer[] = [
  {
    handle: 'NousResearch',
    skillCount: 3,
    note: 'Hermes agent skills · open harness',
  },
  {
    handle: 'solana',
    skillCount: 2,
    note: 'Solana ecosystem agent tools',
  },
  {
    handle: 'xai',
    skillCount: 2,
    note: 'Grok Build plugin authors',
  },
]

export function loadMarketMode(): boolean {
  try {
    return localStorage.getItem(LS_MARKET_MODE) === '1'
  } catch {
    return false
  }
}

export function saveMarketMode(on: boolean) {
  try {
    localStorage.setItem(LS_MARKET_MODE, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function loadXSession(): XSession | null {
  try {
    const raw = localStorage.getItem(LS_X_SESSION)
    if (!raw) return null
    const s = JSON.parse(raw) as XSession
    if (!s?.handle || typeof s.handle !== 'string') return null
    return { ...s, handle: normalizeHandle(s.handle) }
  } catch {
    return null
  }
}

export function saveXSession(session: XSession) {
  localStorage.setItem(
    LS_X_SESSION,
    JSON.stringify({ ...session, handle: normalizeHandle(session.handle) }),
  )
  window.dispatchEvent(new Event('xwealth-market-updated'))
}

export function clearXSession() {
  localStorage.removeItem(LS_X_SESSION)
  window.dispatchEvent(new Event('xwealth-market-updated'))
}

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').slice(0, 15)
}

export function loadMarketSkills(owner?: string): MarketSkill[] {
  try {
    const raw = localStorage.getItem(LS_MARKET_SKILLS)
    const all = raw ? (JSON.parse(raw) as MarketSkill[]) : []
    if (!Array.isArray(all)) return []
    if (!owner) return all
    const h = normalizeHandle(owner)
    return all.filter((s) => normalizeHandle(s.owner) === h)
  } catch {
    return []
  }
}

export function saveMarketSkill(skill: Omit<MarketSkill, 'id' | 'listedAt'>) {
  const owner = normalizeHandle(skill.owner)
  const next: MarketSkill = {
    id: `skill-${Date.now().toString(36)}`,
    name: skill.name.trim().slice(0, 48) || 'untitled-skill',
    blurb: skill.blurb.trim().slice(0, 160),
    owner,
    listedAt: new Date().toISOString(),
  }
  const all = loadMarketSkills()
  all.push(next)
  localStorage.setItem(LS_MARKET_SKILLS, JSON.stringify(all))
  window.dispatchEvent(new Event('xwealth-market-updated'))
  return next
}

export function removeMarketSkill(id: string) {
  const all = loadMarketSkills().filter((s) => s.id !== id)
  localStorage.setItem(LS_MARKET_SKILLS, JSON.stringify(all))
  window.dispatchEvent(new Event('xwealth-market-updated'))
}

export type MarketSeedNode = SeedNode & {
  /** Marketplace-specific panel body */
  market?:
    | 'hub'
    | 'oauth'
    | 'you'
    | 'pay-card'
    | 'skill'
    | 'peer'
    | 'skill-catalog'
}

/** Virtual hub — lives in the top-left wire map UI, not on the force graph. */
export const MKT_HUB_ID = 'mkt-hub'

export function marketCoreId(session: XSession | null): string {
  if (!session) return 'mkt-oauth'
  return `mkt-you-${normalizeHandle(session.handle).toLowerCase()}`
}

/** Hub descriptor for sidebar when wire-map center is clicked. */
export function marketHubNode(): MarketSeedNode {
  return {
    id: MKT_HUB_ID,
    label: 'X Wealth',
    agt: 'EMO',
    radius: 30,
    description:
      'Augment marketplace hub (wire map). Users who add X Wealth connect here so others can find pay cards and agent skills. The canvas graph centers on each user’s core (@handle).',
    subLabels: ['marketplace', 'wire-map', 'EMO'],
    tool: 'market-hub',
    custom: false,
    market: 'hub',
  }
}

export type WireMapSpoke = {
  id: string
  label: string
  kind: 'you' | 'peer' | 'oauth' | 'pay' | 'skills'
}

/**
 * Canvas graph: user CORE is always the middle (you or OAuth gate).
 * X Wealth hub is UI wire-map only — not a force node.
 */
/** VIBE invite: connect your core → their node on WARP marketplace graph */
export type VibeInvite = {
  fromHandle: string
  toHandle: string
  /** optional display / listing id from marketplace */
  listingId?: string
  payUrl?: string
  note?: string
  createdAt: string
  status: 'pending' | 'accepted'
}

export function loadVibeInvites(fromHandle?: string): VibeInvite[] {
  try {
    const raw = localStorage.getItem(LS_VIBE_INVITES)
    const all = raw ? (JSON.parse(raw) as VibeInvite[]) : []
    if (!Array.isArray(all)) return []
    if (!fromHandle) return all
    const h = normalizeHandle(fromHandle)
    return all.filter((i) => normalizeHandle(i.fromHandle) === h)
  } catch {
    return []
  }
}

export function saveVibeInvite(
  invite: Omit<VibeInvite, 'createdAt' | 'status'> & {
    status?: VibeInvite['status']
  },
): VibeInvite {
  const next: VibeInvite = {
    fromHandle: normalizeHandle(invite.fromHandle),
    toHandle: normalizeHandle(invite.toHandle),
    listingId: invite.listingId,
    payUrl: invite.payUrl,
    note: invite.note,
    createdAt: new Date().toISOString(),
    status: invite.status ?? 'pending',
  }
  const all = loadVibeInvites().filter(
    (i) =>
      !(
        normalizeHandle(i.fromHandle) === next.fromHandle &&
        normalizeHandle(i.toHandle) === next.toHandle
      ),
  )
  all.unshift(next)
  localStorage.setItem(LS_VIBE_INVITES, JSON.stringify(all.slice(0, 80)))
  window.dispatchEvent(new Event('xwealth-market-updated'))
  return next
}

export function removeVibeInvite(toHandle: string, fromHandle?: string) {
  const to = normalizeHandle(toHandle)
  const from = fromHandle ? normalizeHandle(fromHandle) : null
  const all = loadVibeInvites().filter((i) => {
    if (normalizeHandle(i.toHandle) !== to) return true
    if (from && normalizeHandle(i.fromHandle) !== from) return true
    return false
  })
  localStorage.setItem(LS_VIBE_INVITES, JSON.stringify(all))
  window.dispatchEvent(new Event('xwealth-market-updated'))
}

/* ── Hidden / removed marketplace nodes (persist until restore) ─────────── */

export function loadHiddenMarketNodes(): string[] {
  try {
    const raw = localStorage.getItem(LS_HIDDEN_MARKET_NODES)
    const all = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(all) ? all.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function saveHiddenMarketNodes(ids: string[]) {
  const uniq = [...new Set(ids)]
  localStorage.setItem(LS_HIDDEN_MARKET_NODES, JSON.stringify(uniq.slice(0, 200)))
  window.dispatchEvent(new Event('xwealth-market-updated'))
}

/** CORE / oauth / hub cannot be deleted from the graph */
export function isProtectedMarketNode(id: string | null | undefined): boolean {
  if (!id) return true
  if (id === MKT_HUB_ID || id === 'mkt-oauth') return true
  if (id.startsWith('mkt-you-')) return true
  return false
}

/**
 * Ids to hide when user removes a node (cascade peer → pay/skills).
 */
export function cascadeHideMarketIds(id: string): string[] {
  const out = new Set<string>([id])
  const m = id.match(/^mkt-(peer|pay|you|skills)-(.+)$/i)
  if (m) {
    const kind = m[1].toLowerCase()
    const key = m[2].toLowerCase()
    if (kind === 'peer') {
      out.add(`mkt-pay-${key}`)
      out.add(`mkt-skills-${key}`)
    }
  }
  // Listed skill nodes (skill-*) — hide self only
  return [...out]
}

export function hideMarketNodes(ids: string[]) {
  const cur = loadHiddenMarketNodes()
  const next = [...cur]
  for (const id of ids) {
    if (isProtectedMarketNode(id)) continue
    for (const h of cascadeHideMarketIds(id)) {
      if (!isProtectedMarketNode(h) && !next.includes(h)) next.push(h)
    }
  }
  saveHiddenMarketNodes(next)
  return next
}

export function unhideMarketNode(id: string) {
  saveHiddenMarketNodes(loadHiddenMarketNodes().filter((x) => x !== id))
}

export function clearHiddenMarketNodes() {
  saveHiddenMarketNodes([])
}

/** True if this market graph node can be removed by the user */
export function canRemoveMarketNode(id: string | null | undefined): boolean {
  if (!id) return false
  if (isProtectedMarketNode(id)) return false
  return (
    id.startsWith('mkt-peer-') ||
    id.startsWith('mkt-pay-') ||
    id.startsWith('mkt-skills-') ||
    id.startsWith('skill-') ||
    id.startsWith('mkt-')
  )
}

export function filterMarketplaceGraph<
  T extends {
    nodes: { id: string }[]
    edges: { source: string; target: string }[]
    spokes: { id: string }[]
  },
>(graph: T, hiddenIds: string[]): T {
  if (!hiddenIds.length) return graph
  const hidden = new Set(hiddenIds)
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => !hidden.has(n.id)),
    edges: graph.edges.filter(
      (e) => !hidden.has(e.source) && !hidden.has(e.target),
    ),
    spokes: graph.spokes.filter((s) => !hidden.has(s.id)),
  }
}

export function buildMarketplaceGraph(opts: {
  session: XSession | null
  skills: MarketSkill[]
  /** VIBE peers invited from /augments (you → them) */
  vibeInvites?: VibeInvite[]
}): {
  nodes: MarketSeedNode[]
  edges: { source: string; target: string }[]
  coreId: string
  spokes: WireMapSpoke[]
} {
  const nodes: MarketSeedNode[] = []
  const edges: { source: string; target: string }[] = []
  const spokes: WireMapSpoke[] = []
  const add = (a: string, b: string) => {
    if (a !== b) edges.push({ source: a, target: b })
  }

  const coreId = marketCoreId(opts.session)
  const vibeInvites = opts.vibeInvites ?? []

  if (!opts.session) {
    nodes.push({
      id: 'mkt-oauth',
      label: 'X Sign-in',
      agt: 'ROOT',
      radius: 28,
      description:
        'Your core until OAuth. Sign in with X — then this becomes your @handle node with pay card + skills.',
      subLabels: ['CORE', 'OAuth', 'required'],
      tool: 'market-oauth',
      custom: false,
      market: 'oauth',
    })
    spokes.push({ id: 'mkt-oauth', label: 'Sign in', kind: 'oauth' })

    for (const p of MARKET_PEERS.slice(0, 3)) {
      const id = `mkt-peer-${p.handle.toLowerCase()}`
      nodes.push({
        id,
        label: `@${p.handle}`,
        agt: 'ENV',
        radius: 15,
        description: `${p.note} · ${p.skillCount} listed skills (preview). Sign in to place your own core.`,
        subLabels: ['peer', 'preview'],
        tool: 'market-peer',
        custom: false,
        market: 'peer',
        href: `https://x.com/${p.handle}`,
      })
      add(coreId, id)
      spokes.push({ id, label: `@${p.handle}`, kind: 'peer' })
    }

    return { nodes, edges, coreId, spokes }
  }

  const handle = normalizeHandle(opts.session.handle)
  const youId = `mkt-you-${handle.toLowerCase()}`
  const payId = `mkt-pay-${handle.toLowerCase()}`
  const catalogId = `mkt-skills-${handle.toLowerCase()}`

  // ── USER CORE (always middle · always orange like Core-00) ──
  nodes.push({
    id: youId,
    label: `@${handle}`,
    agt: 'ROOT',
    radius: 30,
    description: `Your CORE · ${opts.session.displayName || handle}. Always orange identity hub — pay card, skills, and peers orbit this node.`,
    subLabels: ['CORE', 'orange', 'you'],
    tool: 'market-you',
    custom: false,
    market: 'you',
  })
  spokes.push({ id: youId, label: `@${handle}`, kind: 'you' })

  nodes.push({
    id: payId,
    label: 'Pay card',
    agt: 'EMO',
    radius: 18,
    description: `Agentic pay card for @${handle}. Dry-run only on this exhibit.`,
    subLabels: ['agentic', 'X Money'],
    tool: 'market-pay',
    custom: false,
    market: 'pay-card',
  })
  add(youId, payId)
  spokes.push({ id: payId, label: 'Pay', kind: 'pay' })

  nodes.push({
    id: catalogId,
    label: 'My skills',
    agt: 'COG',
    radius: 16,
    description: `Agent software skills under @${handle}.`,
    subLabels: ['skills', 'catalog'],
    tool: 'market-skills',
    custom: false,
    market: 'skill-catalog',
  })
  add(youId, catalogId)
  spokes.push({ id: catalogId, label: 'Skills', kind: 'skills' })

  for (const sk of opts.skills) {
    nodes.push({
      id: sk.id,
      label: sk.name.slice(0, 14),
      agt: 'COG',
      radius: 12,
      description: sk.blurb || `Agent skill · @${sk.owner}`,
      subLabels: ['skill', sk.owner],
      tool: 'market-skill',
      custom: false,
      market: 'skill',
    })
    add(catalogId, sk.id)
  }

  const seenPeers = new Set<string>()

  for (const p of MARKET_PEERS) {
    const key = p.handle.toLowerCase()
    seenPeers.add(key)
    const id = `mkt-peer-${key}`
    nodes.push({
      id,
      label: `@${p.handle}`,
      agt: 'ENV',
      radius: 15,
      description: `${p.note} · ${p.skillCount} skills. Connected via X Wealth augment.`,
      subLabels: ['peer', `${p.skillCount} skills`],
      tool: 'market-peer',
      custom: false,
      market: 'peer',
      href: `https://x.com/${p.handle}`,
    })
    // Social edges radiate from USER CORE (not a hub node on canvas)
    add(youId, id)
    spokes.push({ id, label: `@${p.handle}`, kind: 'peer' })
    // Every peer gets a pay-card spoke so graph click → pay detail always works
    const peerPayId = `mkt-pay-${key}`
    if (!nodes.some((n) => n.id === peerPayId)) {
      nodes.push({
        id: peerPayId,
        label: 'Pay card',
        agt: 'EMO',
        radius: 13,
        description: `Agentic pay card · @${p.handle}. Local harness dry-run · USDC on Solana.`,
        subLabels: ['pay', p.handle],
        tool: 'market-pay',
        custom: false,
        market: 'pay-card',
        href: `https://x.com/i/money/pay/${p.handle}`,
      })
      add(id, peerPayId)
    }
  }

  // VIBE-05 invites from Augment Marketplace right-click
  for (const inv of vibeInvites) {
    const key = normalizeHandle(inv.toHandle).toLowerCase()
    if (!key || key === handle.toLowerCase()) continue
    const id = `mkt-peer-${key}`
    if (!seenPeers.has(key)) {
      seenPeers.add(key)
      nodes.push({
        id,
        label: `@${normalizeHandle(inv.toHandle)}`,
        agt: 'EMO',
        radius: 16,
        description:
          inv.note ||
          `VIBE invite from @${handle}. Connect nodes · agentic pay card.`,
        subLabels: ['VIBE', inv.status, 'invite'],
        tool: 'market-peer',
        custom: false,
        market: 'peer',
        href: inv.payUrl || `https://x.com/${normalizeHandle(inv.toHandle)}`,
      })
      spokes.push({
        id,
        label: `@${normalizeHandle(inv.toHandle)}`,
        kind: 'peer',
      })
    }
    add(youId, id)
    // Peer also gets a pay-card spoke so agentic pay surfaces on the graph
    const peerPayId = `mkt-pay-${key}`
    if (!nodes.some((n) => n.id === peerPayId)) {
      nodes.push({
        id: peerPayId,
        label: 'Pay card',
        agt: 'EMO',
        radius: 13,
        description: `Agentic pay card · @${normalizeHandle(inv.toHandle)} (VIBE).`,
        subLabels: ['VIBE', 'pay'],
        tool: 'market-pay',
        custom: false,
        market: 'pay-card',
        href: inv.payUrl,
      })
      add(id, peerPayId)
    }
  }

  return { nodes, edges, coreId, spokes }
}

/** Default selection when entering marketplace mode = user CORE */
export function marketDefaultSelect(session: XSession | null): string {
  return marketCoreId(session)
}

export function isMarketNodeId(id: string | null | undefined): boolean {
  if (!id) return false
  return (
    id.startsWith('mkt-') ||
    id.startsWith('skill-') ||
    id === 'mkt-hub'
  )
}

export type MarketTool = NonNullable<MarketSeedNode['tool']>

export function isMarketTool(t: SeedNode['tool'] | undefined): boolean {
  return typeof t === 'string' && t.startsWith('market-')
}

// re-export AgtKey usage helper for typing
export type { AgtKey }
