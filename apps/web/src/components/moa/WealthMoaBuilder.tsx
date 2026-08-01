/**
 * Wealth-08 MOA Builder — visual language of Warp-03 / docs MOA.
 * + Add node works (localStorage). Device node shows this agent host + harness edges.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import {
  type AgtKey,
  type CustomWealthNode,
  loadCustomNodes,
  loadHarnessBindings,
  markHarnessWired,
  probeDevice,
  saveCustomNodes,
  saveWalletHint,
  type HarnessBinding,
} from '@/lib/wealth-moa-store'
import {
  SEED_AUGMENTS,
  WEALTH_PURPLE,
  WEALTH_PURPLE_GLOW,
  WEALTH_TOOLS,
  inferEdges,
  type SeedNode,
} from '@/lib/wealth-moa-seed'
import {
  buildMarketplaceGraph,
  buildVibeDmUrl,
  canRemoveMarketNode,
  clearHiddenMarketNodes,
  clearXSession,
  filterMarketplaceGraph,
  hideMarketNodes,
  loadHiddenMarketNodes,
  loadMarketMode,
  loadMarketSkills,
  loadVibeInvites,
  loadXSession,
  marketCoreId,
  marketDefaultSelect,
  marketHubNode,
  MKT_HUB_ID,
  normalizeHandle,
  removeMarketSkill,
  removeVibeInvite,
  saveMarketMode,
  saveMarketSkill,
  saveVibeInvite,
  saveXSession,
  type VibeInvite,
  type MarketSkill,
  type WireMapSpoke,
  type XSession,
} from '@/lib/augment-marketplace'
import { toast } from 'sonner'
import { Asciify } from '@/components/canvasui/Asciify'
import { GlassObject } from '@/components/canvasui/GlassObject'
import { JettUxOverlay } from '@/components/JettUxOverlay'
import { EXHIBIT } from '@/lib/exhibit'
import { makeAgtState, weightsFromNodeAgt } from '@/lib/agt-gaze'
import { drawNodeIcon, iconKindForNode } from '@/lib/node-icons'
import { checkJtxGate, defaultWalletFromEnv, type JtxGateResult } from '@/lib/jtxGate'
import { decodeQrFromFile } from '@/lib/decodeQr'
import { parseTransferPayload, type TransferResolve } from '@/lib/xMoneyTransfer'
import { buildDryRunIntent } from '@/lib/exhibit'
import { cn } from '@/lib/utils'
import { PrivySignInButton } from '@/auth/PrivySignInButton'
import { useXWealthAuth } from '@/auth/useXWealthAuth'
import { privyEnabled } from '@/auth/privyConfig'
import { DashboardMenu } from '@/components/DashboardMenu'
import {
  MarketCardPanelControls,
  WarpMarketFloatingCards,
  useWarpMarketCardState,
  type MarketFocusPeer,
} from '@/components/moa/WarpMarketCards'

/** Parse @handle from marketplace node ids (mkt-peer-x / mkt-pay-x / …) */
function handleFromMarketNodeId(id: string | null | undefined): string | null {
  if (!id) return null
  const m = id.match(/^mkt-(?:peer|pay|you|skills)-(.+)$/i)
  return m ? normalizeHandle(m[1]) : null
}

const DEFAULT_GLASS = '/qr-glass.svg'

const AGT: Record<AgtKey, { color: string; glow: string }> = {
  COG: { color: '#eab308', glow: 'rgba(234,179,8,0.35)' },
  EMO: { color: '#f43f5e', glow: 'rgba(244,63,94,0.35)' },
  ENV: { color: '#60a5fa', glow: 'rgba(96,165,250,0.35)' },
  ROOT: { color: '#f97316', glow: 'rgba(249,115,22,0.35)' },
}

function isMarketPeerNode(n: { id: string; tool?: string }) {
  return n.id.startsWith('mkt-peer-') || n.tool === 'market-peer'
}

function colorForNode(n: { id: string; agt: AgtKey; tool?: string }) {
  if (n.id === '8-wealth') {
    return { color: WEALTH_PURPLE, glow: WEALTH_PURPLE_GLOW }
  }
  // Other users (peers) — always purple identity on the graph
  if (isMarketPeerNode(n)) {
    return { color: WEALTH_PURPLE, glow: WEALTH_PURPLE_GLOW }
  }
  // User CORE handle (@you) — always orange like Core-00
  if (n.id.startsWith('mkt-you-') || n.tool === 'market-you') {
    return AGT.ROOT
  }
  // Wire-map hub + pay card stay EMO red
  if (n.id === 'mkt-hub' || n.id.startsWith('mkt-pay-')) {
    return AGT.EMO
  }
  return AGT[n.agt]
}

type NodeDatum = SeedNode & {
  custom: boolean
  connectTo?: string
}

type SimNode = NodeDatum & {
  x: number
  y: number
  vx: number
  vy: number
  pulse: number
  /** AGT triangle home (set by Focus layout) */
  layoutX?: number
  layoutY?: number
}

type EdgeDatum = { source: string; target: string }
type Particle = { edge: number; t: number; speed: number; color: string; size: number }

export function WealthMoaBuilder() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<EdgeDatum[]>([])
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef(0)
  const timeRef = useRef(0)
  const panRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const zoomRef = useRef(1)
  /** World-pinned CORE id (user in market · Core-00 in MOA) */
  const coreIdRef = useRef<string | null>('0-core')
  /** After Focus: hold COG↑ EMO↙ ENV↘ triangle until unfocus / drag */
  const layoutLockRef = useRef(false)
  const focusModeRef = useRef(false)
  const [focusMode, setFocusMode] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [dims, setDims] = useState({ w: 900, h: 700 })
  const [customNodes, setCustomNodes] = useState<CustomWealthNode[]>([])
  const [harness, setHarness] = useState<HarnessBinding[]>([])
  const [device, setDevice] = useState(() =>
    typeof window !== 'undefined'
      ? probeDevice()
      : {
          id: 'device-local',
          label: 'Device',
          platform: '',
          online: true,
          language: 'en',
          walletHint: null,
        },
  )
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>('8-wealth')
  const [dragging, setDragging] = useState<SimNode | null>(null)
  const [panning, setPanning] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  /** Jett UX dock (right) — morphs from JTX logo chrome */
  const [showJettUX, setShowJettUX] = useState(false)
  /** Exhibit has no camera; label stays "gaze idle" unless flipped later */
  const [gazeLive] = useState(false)
  /** Right-click context menu on graph canvas / nodes */
  const [graphMenu, setGraphMenu] = useState<{
    x: number
    y: number
    nodeId: string | null
    kind: 'node' | 'canvas'
  } | null>(null)

  /** Top-bar X toggle: wipe MOA → Augment marketplace graph */
  const [marketMode, setMarketMode] = useState(false)
  const [xSession, setXSession] = useState<XSession | null>(null)
  const [marketSkills, setMarketSkills] = useState<MarketSkill[]>([])
  const [vibeInvites, setVibeInvites] = useState<VibeInvite[]>([])
  const [hiddenMarketIds, setHiddenMarketIds] = useState<string[]>([])
  const [showXAuth, setShowXAuth] = useState(false)
  /** Peer handle to focus after VIBE invite from /augments */
  const [pendingFocusHandle, setPendingFocusHandle] = useState<string | null>(
    null,
  )
  const marketCards = useWarpMarketCardState()


  // Live tools state
  const [wallet, setWallet] = useState(defaultWalletFromEnv)
  const [gate, setGate] = useState<JtxGateResult | null>(null)
  const [gateBusy, setGateBusy] = useState(false)
  const [pasteUrl, setPasteUrl] = useState('')
  const [decode, setDecode] = useState<TransferResolve | null>(null)
  const [previewSrc, setPreviewSrc] = useState('')
  const [qrBusy, setQrBusy] = useState(false)
  const [payNote, setPayNote] = useState(
    'Drop X Money QR or paste pay/transfer link',
  )

  useEffect(() => {
    setCustomNodes(loadCustomNodes())
    setHarness(loadHarnessBindings())
    setDevice(probeDevice())
    setMarketMode(loadMarketMode())
    setXSession(loadXSession())
    setMarketSkills(loadMarketSkills())
    setVibeInvites(loadVibeInvites())
    setHiddenMarketIds(loadHiddenMarketNodes())
    // Deep-link from /augments VIBE invite: /warp?market=1&vibe=@handle
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('market') === '1' || sp.get('vibe')) {
        setMarketMode(true)
        saveMarketMode(true)
      }
      const vibe = sp.get('vibe')
      if (vibe) setPendingFocusHandle(normalizeHandle(vibe))
    } catch {
      /* ignore */
    }
    const onUp = () => {
      setCustomNodes(loadCustomNodes())
      setHarness(loadHarnessBindings())
      setDevice(probeDevice())
      setHiddenMarketIds(loadHiddenMarketNodes())
      setVibeInvites(loadVibeInvites())
      setMarketSkills(loadMarketSkills())
    }
    const onMarket = () => {
      setXSession(loadXSession())
      setMarketSkills(loadMarketSkills())
      setMarketMode(loadMarketMode())
      setVibeInvites(loadVibeInvites(loadXSession()?.handle))
    }
    window.addEventListener('wealth-moa-updated', onUp)
    window.addEventListener('xwealth-market-updated', onMarket)
    window.addEventListener('storage', onUp)
    window.addEventListener('storage', onMarket)
    return () => {
      window.removeEventListener('wealth-moa-updated', onUp)
      window.removeEventListener('xwealth-market-updated', onMarket)
      window.removeEventListener('storage', onUp)
      window.removeEventListener('storage', onMarket)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc)
    }
  }, [previewSrc])

  // Slash opens add; Escape closes overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !showAdd && !showJettUX) {
        const t = e.target as HTMLElement
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
        e.preventDefault()
        setShowAdd(true)
      }
      if (e.key === 'Escape') {
        setShowAdd(false)
        setShowJettUX(false)
        setShowXAuth(false)
        setGraphMenu(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAdd, showJettUX])

  const mySkills = useMemo(() => {
    if (!xSession) return [] as MarketSkill[]
    const h = normalizeHandle(xSession.handle)
    return marketSkills.filter((s) => normalizeHandle(s.owner) === h)
  }, [marketSkills, xSession])

  const marketplaceGraph = useMemo(() => {
    const raw = buildMarketplaceGraph({
      session: xSession,
      skills: mySkills,
      vibeInvites: xSession
        ? vibeInvites.length
          ? vibeInvites
          : loadVibeInvites(xSession.handle)
        : vibeInvites,
    })
    return filterMarketplaceGraph(raw, hiddenMarketIds)
  }, [xSession, mySkills, vibeInvites, hiddenMarketIds])

  // Pin CORE for sim + focus target
  useEffect(() => {
    if (marketMode) {
      coreIdRef.current = marketplaceGraph.coreId
    } else {
      coreIdRef.current = '0-core'
    }
  }, [marketMode, marketplaceGraph.coreId])

  useEffect(() => {
    focusModeRef.current = focusMode
    layoutLockRef.current = focusMode
  }, [focusMode])

  const nodeData: NodeDatum[] = useMemo(() => {
    // Marketplace MDX graph — MOA wiped while top X toggle is on
    if (marketMode) {
      return marketplaceGraph.nodes.map((n) => ({ ...n, custom: false }))
    }

    const deviceNode: NodeDatum = {
      id: device.id,
      label: device.label || 'Device',
      agt: 'ENV',
      radius: 22,
      description: `Agent host on this device · ${device.platform}${device.online ? ' · online' : ' · offline'}`,
      subLabels: [
        device.online ? 'online' : 'offline',
        device.walletHint ? `wallet ${device.walletHint.slice(0, 4)}…` : 'no wallet',
        'harness bus',
      ],
      custom: false,
      harness: 'browser',
    }

    const harnessNodes: NodeDatum[] = harness.map((h) => ({
      id: `harness-${h.harness}`,
      label: h.label.replace(/\s+/g, '').slice(0, 12),
      agt: h.wired ? 'ENV' : 'COG',
      radius: 15,
      description: `${h.wired ? 'WIRED' : 'UNWIRED'} · ${h.note || h.harness} · device edge`,
      subLabels: [h.harness, h.wired ? 'wired' : 'unwired'],
      custom: false,
      harness: h.harness,
    }))

    const customs: NodeDatum[] = customNodes.map((c) => ({
      id: c.id,
      label: c.name,
      agt: c.tensor,
      radius: 16,
      description: c.description || `Harness plug · ${c.harness}`,
      subLabels: [c.harness, c.plug ? 'plug' : 'custom'],
      custom: true,
      connectTo: c.connectTo,
      harness: c.harness,
    }))

    return [...SEED_AUGMENTS, ...WEALTH_TOOLS, deviceNode, ...harnessNodes, ...customs]
  }, [customNodes, harness, device, marketMode, marketplaceGraph.nodes])

  /** AGT state for JettUxOverlay — from selected MOA node (no camera). */
  const agtState = useMemo(() => {
    const n =
      nodeData.find((x) => x.id === selectedId) ??
      nodesRef.current.find((x) => x.id === selectedId)
    return makeAgtState(weightsFromNodeAgt(n?.agt, n?.id ?? selectedId))
  }, [selectedId, nodeData])

  const edgeData = useMemo(() => {
    if (marketMode) return marketplaceGraph.edges

    const ids = nodeData.map((n) => n.id)
    const customEdges = customNodes.map((c) => ({
      id: c.id,
      connectTo: c.connectTo,
    }))
    for (const h of harness) {
      customEdges.push({ id: `harness-${h.harness}`, connectTo: device.id })
    }
    return inferEdges(ids, customEdges, device.id)
  }, [nodeData, customNodes, harness, device.id, marketMode, marketplaceGraph.edges])

  function enterMarketMode(on: boolean) {
    setMarketMode(on)
    saveMarketMode(on)
    if (on) {
      const core = marketDefaultSelect(xSession ?? loadXSession())
      setSelectedId(core)
      setShowAdd(false)
      // After nodes sync → optional focus stay if already focused
      window.setTimeout(() => {
        coreIdRef.current = core
        setSelectedId(core)
        if (focusModeRef.current) applyAgtTriangleLayout(core)
      }, 80)
    } else {
      setSelectedId('0-core')
      window.setTimeout(() => {
        coreIdRef.current = '0-core'
        setSelectedId('0-core')
        if (focusModeRef.current) applyAgtTriangleLayout('0-core')
      }, 80)
    }
  }

  function completeXSignIn(
    handleRaw: string,
    displayName?: string,
    method: XSession['method'] = 'privy-x',
  ) {
    const handle = normalizeHandle(handleRaw)
    if (!handle) return
    const session: XSession = {
      handle,
      displayName: displayName?.trim() || handle,
      signedInAt: new Date().toISOString(),
      method,
    }
    saveXSession(session)
    setXSession(session)
    setShowXAuth(false)
    setMarketMode(true)
    saveMarketMode(true)
    setSelectedId(marketDefaultSelect(session))
  }

  function signOutX() {
    clearXSession()
    setXSession(null)
    setSelectedId('mkt-oauth')
  }

  // Sync sim
  useEffect(() => {
    if (dims.w < 50 || dims.h < 50) return
    const cx = dims.w / 2
    const cy = dims.h / 2
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]))
    const spread = Math.min(dims.w, dims.h) * 0.32

    nodesRef.current = nodeData.map((n, i) => {
      const existing = prev.get(n.id)
      if (existing) {
        return {
          ...existing,
          ...n,
          // Keep sim + Focus layout homes
          x: existing.x,
          y: existing.y,
          vx: existing.vx,
          vy: existing.vy,
          layoutX: existing.layoutX,
          layoutY: existing.layoutY,
          pulse: existing.pulse,
        }
      }
      let x = cx
      let y = cy
      const isCore =
        n.id === '0-core' ||
        n.id === '8-wealth' ||
        n.id.startsWith('mkt-you-') ||
        n.id === 'mkt-oauth'
      if (!isCore) {
        // Initial spawn already on AGT rays (same as Focus triad)
        const baseAngle =
          n.agt === 'COG' || n.agt === 'ROOT'
            ? -Math.PI / 2
            : n.agt === 'EMO'
              ? (Math.PI * 5) / 6
              : Math.PI / 6
        const angle = baseAngle + (Math.random() - 0.5) * 0.25
        const dist = spread * (0.85 + Math.random() * 0.15)
        x = cx + Math.cos(angle) * dist
        y = cy + Math.sin(angle) * dist
      } else {
        // CORE always middle of canvas
        x = cx
        y = cy
      }
      return {
        ...n,
        x,
        y,
        vx: 0,
        vy: 0,
        layoutX: x,
        layoutY: y,
        pulse: (i / Math.max(nodeData.length, 1)) * Math.PI * 2,
      }
    })
    edgesRef.current = edgeData

    const particles: Particle[] = []
    const count = Math.min(16, Math.max(8, edgeData.length * 2))
    for (let i = 0; i < count; i++) {
      const keys: AgtKey[] = ['COG', 'EMO', 'ENV', 'ROOT']
      particles.push({
        edge: edgeData.length ? Math.floor(Math.random() * edgeData.length) : 0,
        t: Math.random(),
        speed: 0.001 + Math.random() * 0.002,
        color: AGT[keys[Math.floor(Math.random() * keys.length)]].color,
        size: 0.8 + Math.random() * 0.8,
      })
    }
    particlesRef.current = particles
  }, [nodeData, edgeData, dims])

  useEffect(() => {
    const resize = () => {
      const el = containerRef.current
      const w = el?.clientWidth || window.innerWidth
      const h = el?.clientHeight || window.innerHeight
      setDims({ w, h })
    }
    resize()
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => {
      window.removeEventListener('resize', resize)
      ro.disconnect()
    }
  }, [])

  const getConnected = useCallback((nodeId: string) => {
    const ids = new Set<string>()
    edgesRef.current.forEach((e) => {
      if (e.source === nodeId) ids.add(e.target)
      if (e.target === nodeId) ids.add(e.source)
    })
    return ids
  }, [])

  // Draw loop (Warp style)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cx = dims.w / 2
    const cy = dims.h / 2

    function simulate() {
      const nodes = nodesRef.current
      const edges = edgesRef.current
      const pan = panRef.current
      const centerX = cx - pan.x
      const centerY = cy - pan.y
      const pinnedCore = coreIdRef.current
      const locked = layoutLockRef.current

      // Focus lock: smooth settle into AGT triangle (COG↑ EMO↙ ENV↘)
      // Core is only held at center while Focus is ON and not being dragged.
      if (locked) {
        for (const n of nodes) {
          if (dragging && n.id === dragging.id) {
            // User is dragging — release focus so core (or any node) can move freely
            layoutLockRef.current = false
            focusModeRef.current = false
            n.vx = 0
            n.vy = 0
            continue
          }
          if (pinnedCore && n.id === pinnedCore) {
            // Ease core to center only while focused (not while dragging)
            n.vx += (cx - n.x) * 0.06
            n.vy += (cy - n.y) * 0.06
            n.vx *= 0.86
            n.vy *= 0.86
            n.x += n.vx
            n.y += n.vy
            if (Math.hypot(n.x - cx, n.y - cy) < 0.4) {
              n.x = cx
              n.y = cy
              n.vx = 0
              n.vy = 0
            }
            continue
          }
          if (n.layoutX != null && n.layoutY != null) {
            n.vx += (n.layoutX - n.x) * 0.042
            n.vy += (n.layoutY - n.y) * 0.042
            n.vx *= 0.9
            n.vy *= 0.9
            n.x += n.vx
            n.y += n.vy
          }
        }
        return
      }

      // Free layout — Core-00 / @you is a normal node (no snap-to-center)
      for (const n of nodes) {
        if (dragging && n.id === dragging.id) continue
        n.vx += (centerX - n.x) * 0.0005
        n.vy += (centerY - n.y) * 0.0005
      }
      for (let i = 0; i < nodes.length; i++) {
        if (dragging && nodes[i].id === dragging.id) continue
        for (let j = i + 1; j < nodes.length; j++) {
          if (dragging && nodes[j].id === dragging.id) continue
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.max(Math.hypot(dx, dy), 1)
          const force = 1900 / (dist * dist)
          nodes[i].vx -= (dx / dist) * force
          nodes[i].vy -= (dy / dist) * force
          nodes[j].vx += (dx / dist) * force
          nodes[j].vy += (dy / dist) * force
        }
      }
      const nodeMap = new Map(nodes.map((n) => [n.id, n]))
      for (const e of edges) {
        const s = nodeMap.get(e.source)
        const t = nodeMap.get(e.target)
        if (!s || !t) continue
        if (dragging && (s.id === dragging.id || t.id === dragging.id)) continue
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.max(Math.hypot(dx, dy), 1)
        const force = (dist - 170) * 0.0012
        s.vx += (dx / dist) * force
        s.vy += (dy / dist) * force
        t.vx -= (dx / dist) * force
        t.vy -= (dy / dist) * force
      }
      for (const n of nodes) {
        if (dragging && n.id === dragging.id) continue
        n.vx *= 0.86
        n.vy *= 0.86
        n.x += n.vx * 0.35
        n.y += n.vy * 0.35
      }
    }

    function draw() {
      if (!ctx || !canvas) return
      const nodes = nodesRef.current
      const edges = edgesRef.current
      const particles = particlesRef.current
      timeRef.current += 0.016
      const t = timeRef.current
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = dims.w * dpr
      canvas.height = dims.h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const pan = panRef.current
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(dims.w, dims.h) * 0.7)
      bgGrad.addColorStop(0, '#0d0908')
      bgGrad.addColorStop(0.3, '#0a0706')
      bgGrad.addColorStop(0.6, '#080505')
      bgGrad.addColorStop(1, '#050303')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, dims.w, dims.h)

      const atmo = ctx.createRadialGradient(cx * 0.8, cy * 0.6, 0, cx, cy, Math.max(dims.w, dims.h) * 0.5)
      atmo.addColorStop(0, 'rgba(249,115,22,0.04)')
      atmo.addColorStop(0.4, 'rgba(239,68,68,0.015)')
      atmo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = atmo
      ctx.fillRect(0, 0, dims.w, dims.h)

      const zoom = zoomRef.current
      ctx.save()
      ctx.translate(dims.w / 2, dims.h / 2)
      ctx.scale(zoom, zoom)
      ctx.translate(-dims.w / 2 + pan.x, -dims.h / 2 + pan.y)

      const nodeMap = new Map(nodes.map((n) => [n.id, n]))
      const activeId = selectedId || hoveredId
      const connected = activeId ? getConnected(activeId) : new Set<string>()

      // Focus mode: purple dashed letter-Y that divides the full MDX viewport
      // Canvas y grows down → letter Y is: stem ↓ · arm ↖ · arm ↗ (not inverted Mercedes)
      if (focusModeRef.current) {
        const core =
          (coreIdRef.current && nodeMap.get(coreIdRef.current)) ||
          nodeMap.get('0-core') ||
          nodeMap.get('8-wealth')
        if (core) {
          // Visible world AABB (inverse of canvas pan/zoom transform)
          const minX = -dims.w / (2 * zoom) + dims.w / 2 - pan.x
          const maxX = dims.w / (2 * zoom) + dims.w / 2 - pan.x
          const minY = -dims.h / (2 * zoom) + dims.h / 2 - pan.y
          const maxY = dims.h / (2 * zoom) + dims.h / 2 - pan.y
          const pad = 4 / zoom // slightly past edge so stroke isn't clipped

          /** Cast ray from origin along unit dir until it exits the AABB */
          const rayToEdge = (ox: number, oy: number, ang: number) => {
            const dx = Math.cos(ang)
            const dy = Math.sin(ang)
            let t = Number.POSITIVE_INFINITY
            if (dx > 1e-9) t = Math.min(t, (maxX + pad - ox) / dx)
            else if (dx < -1e-9) t = Math.min(t, (minX - pad - ox) / dx)
            if (dy > 1e-9) t = Math.min(t, (maxY + pad - oy) / dy)
            else if (dy < -1e-9) t = Math.min(t, (minY - pad - oy) / dy)
            if (!Number.isFinite(t) || t <= 0) {
              t = Math.hypot(dims.w, dims.h) / zoom
            }
            return { x: ox + dx * t, y: oy + dy * t }
          }

          // Letter Y (screen space): two arms up, stem down — edge-to-edge
          //   \   /
          //    \ /
          //     |
          const yAngles = [
            -Math.PI / 2 - Math.PI / 3, // ↖ up-left  (−150° / −5π/6)
            -Math.PI / 2 + Math.PI / 3, // ↗ up-right (−30° / −π/6)
            Math.PI / 2, // ↓ stem
          ]

          ctx.save()
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          // Soft glow under dashes
          ctx.setLineDash([])
          ctx.lineWidth = 4 / Math.max(zoom, 0.5)
          ctx.strokeStyle = 'rgba(168,85,247,0.12)'
          for (const ang of yAngles) {
            const tip = rayToEdge(core.x, core.y, ang)
            ctx.beginPath()
            ctx.moveTo(core.x, core.y)
            ctx.lineTo(tip.x, tip.y)
            ctx.stroke()
          }

          // Main purple dashed sector dividers — full span to MDX edges
          ctx.setLineDash([14 / zoom, 10 / zoom])
          ctx.lineWidth = 2 / Math.max(zoom, 0.5)
          ctx.strokeStyle = 'rgba(168,85,247,0.72)'
          for (const ang of yAngles) {
            const tip = rayToEdge(core.x, core.y, ang)
            ctx.beginPath()
            ctx.moveTo(core.x, core.y)
            ctx.lineTo(tip.x, tip.y)
            ctx.stroke()
          }

          // Brighter inner dash for read
          ctx.setLineDash([7 / zoom, 8 / zoom])
          ctx.lineWidth = 1.1 / Math.max(zoom, 0.5)
          ctx.strokeStyle = 'rgba(216,180,254,0.55)'
          for (const ang of yAngles) {
            const tip = rayToEdge(core.x, core.y, ang)
            ctx.beginPath()
            ctx.moveTo(core.x, core.y)
            ctx.lineTo(tip.x, tip.y)
            ctx.stroke()
          }

          ctx.setLineDash([])
          ctx.restore()
        }
      }

      for (const e of edges) {
        const s = nodeMap.get(e.source)
        const tp = nodeMap.get(e.target)
        if (!s || !tp) continue
        const isActive = activeId && (e.source === activeId || e.target === activeId)
        const toDevice =
          e.source === device.id ||
          e.target === device.id ||
          e.source.startsWith('harness-') ||
          e.target.startsWith('harness-')

        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(tp.x, tp.y)
        if (isActive) {
          const sc = colorForNode(s)
          const tc = colorForNode(tp)
          const grad = ctx.createLinearGradient(s.x, s.y, tp.x, tp.y)
          grad.addColorStop(0, sc.color + 'bb')
          grad.addColorStop(1, tc.color + 'bb')
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.75
          ctx.setLineDash([4, 4])
          ctx.lineDashOffset = -t * 15
        } else if (toDevice) {
          ctx.strokeStyle = 'rgba(249,115,22,0.4)'
          ctx.lineWidth = 1.15
          ctx.setLineDash([2, 4])
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.16)'
          ctx.lineWidth = 0.9
          ctx.setLineDash([3, 5])
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      for (const p of particles) {
        if (!edges.length) break
        const e = edges[p.edge % edges.length]
        const s = nodeMap.get(e.source)
        const tp = nodeMap.get(e.target)
        if (!s || !tp) continue
        p.t += p.speed
        if (p.t > 1) {
          p.t = 0
          p.edge = Math.floor(Math.random() * edges.length)
        }
        const px = s.x + (tp.x - s.x) * p.t
        const py = s.y + (tp.y - s.y) * p.t
        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + '44'
        ctx.fill()
      }

      for (const n of nodes) {
        const agt = colorForNode(n)
        const isActive = n.id === activeId
        const isConnected = connected.has(n.id)
        const isPeer = isMarketPeerNode(n)
        // Soft focus only — never grey-out whole graph
        const focus =
          !activeId || isActive || isConnected ? 'hot' : 'soft'
        const pulse = Math.sin(t * 0.45 + n.pulse) * 0.012 + 1
        const r = n.radius * (isActive ? 1.04 : pulse)
        const nx = Math.round(n.x * 2) / 2
        const ny = Math.round(n.y * 2) / 2

        const glowR = r + 5 + Math.sin(t * 0.8 + n.pulse) * 1.1
        const gradG = ctx.createRadialGradient(nx, ny, r * 0.9, nx, ny, glowR)
        // Peers + Wealth always purple glow; selected peer keeps purple body
        const g0 =
          n.id === '8-wealth' || isPeer
            ? isActive
              ? 'rgba(168,85,247,0.42)'
              : focus === 'hot'
                ? 'rgba(168,85,247,0.2)'
                : 'rgba(168,85,247,0.1)'
            : agt.glow.replace(
                '0.35',
                isActive ? '0.32' : focus === 'hot' ? '0.14' : '0.08',
              )
        gradG.addColorStop(0, g0)
        gradG.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(nx, ny, glowR, 0, Math.PI * 2)
        ctx.fillStyle = gradG
        ctx.fill()

        if (isActive) {
          const ringPhase = (t * 0.4) % 1
          const ringR = r + ringPhase * 18
          const ringAlpha = (1 - ringPhase) * 0.22
          // Selected peer: EMO red pulse ring (connection), body stays purple
          const ringHex = isPeer ? AGT.EMO.color : agt.color
          ctx.beginPath()
          ctx.arc(nx, ny, ringR, 0, Math.PI * 2)
          ctx.strokeStyle =
            ringHex + Math.round(ringAlpha * 255).toString(16).padStart(2, '0')
          ctx.lineWidth = 1.25 * (1 - ringPhase)
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(nx, ny, r, 0, Math.PI * 2)
        const grad = ctx.createRadialGradient(
          nx - r * 0.3,
          ny - r * 0.3,
          0,
          nx,
          ny,
          r,
        )
        // All nodes keep full color; soft focus only slightly darkens
        const hi = isActive ? 'ff' : focus === 'hot' ? 'ee' : 'aa'
        const lo = isActive ? 'cc' : focus === 'hot' ? '99' : '66'
        grad.addColorStop(0, agt.color + hi)
        grad.addColorStop(1, agt.color + lo)
        ctx.globalAlpha = focus === 'soft' ? 0.72 : 1
        ctx.fillStyle = grad
        ctx.fill()
        ctx.globalAlpha = 1

        // Peer selected → red edge; else white when active, node tint when idle
        if (isPeer && isActive) {
          ctx.strokeStyle = 'rgba(244,63,94,0.95)'
          ctx.lineWidth = 2.1
        } else {
          ctx.strokeStyle = isActive
            ? 'rgba(255,255,255,0.85)'
            : agt.color + '66'
          ctx.lineWidth = isActive ? 1.75 : 0.75
        }
        ctx.stroke()

        // Red social/economic outline: marketplace @you CORE + Wealth-08 on MOA
        const isMarketYou =
          n.id.startsWith('mkt-you-') || n.tool === 'market-you'
        const isWealth08 = n.id === '8-wealth' || n.tool === 'hub'
        if (isMarketYou || isWealth08) {
          ctx.beginPath()
          ctx.arc(nx, ny, r + 3.5, 0, Math.PI * 2)
          ctx.strokeStyle = isActive
            ? 'rgba(251,113,133,0.95)'
            : 'rgba(244,63,94,0.85)'
          ctx.lineWidth = 2.25
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(nx, ny, r + 6.5, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(244,63,94,0.22)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Other-user peer: purple body always; when selected, EMO red outer ring
        if (isPeer && isActive) {
          ctx.beginPath()
          ctx.arc(nx, ny, r + 4, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(244,63,94,0.95)'
          ctx.lineWidth = 2.4
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(nx, ny, r + 7, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(244,63,94,0.28)'
          ctx.lineWidth = 1.1
          ctx.stroke()
        }

        if (n.custom || n.id.startsWith('harness-') || n.id === device.id) {
          ctx.beginPath()
          ctx.arc(nx, ny, r + 4, 0, Math.PI * 2)
          ctx.setLineDash([2, 3])
          ctx.strokeStyle = n.id === device.id ? '#f97316aa' : agt.color + '77'
          ctx.lineWidth = 0.85
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Icon inside node (Core=brain-circuit, Wealth=money, else COG/EMO/ENV…)
        const iconKind = iconKindForNode(n)
        const iconSize = Math.max(14, r * 1.05)
        const iconAlpha = focus === 'soft' ? 0.65 : 0.95
        ctx.globalAlpha = iconAlpha
        // subtle dark disc so white stroke reads on light/dark fills
        ctx.beginPath()
        ctx.arc(nx, ny, iconSize * 0.38, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.fill()
        drawNodeIcon(
          ctx,
          iconKind,
          nx,
          ny,
          iconSize,
          'rgba(255,255,255,0.94)',
        )
        ctx.globalAlpha = 1

        // Modern labels below the node — Syne geometric sans, soft shadow
        const fontSize = r > 28 ? 12 : r > 20 ? 11 : 10
        const label = n.label.length > 14 ? `${n.label.slice(0, 13)}…` : n.label
        ctx.font = `600 ${fontSize}px Syne, "Segoe UI", system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const lx = Math.round(nx)
        const ly = Math.round(ny + r + 6)
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        for (const [ox, oy] of [
          [0, 1],
          [0, 2],
          [1, 1],
          [-1, 1],
        ] as const) {
          ctx.fillText(label, lx + ox, ly + oy)
        }
        ctx.fillStyle =
          focus === 'soft' ? 'rgba(232,236,247,0.72)' : 'rgba(245,247,252,0.95)'
        ctx.fillText(label, lx, ly)
      }

      ctx.restore()
      simulate()
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [dims, hoveredId, selectedId, dragging, panning, zoomLevel, getConnected, device.id])

  const findNodeAt = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    const pan = panRef.current
    const zoom = zoomRef.current
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    const x = (sx - rect.width / 2) / zoom + rect.width / 2 - pan.x
    const y = (sy - rect.height / 2) / zoom + rect.height / 2 - pan.y
    // Prefer larger hit targets on touch (mobile)
    const pad = 10
    for (const n of nodesRef.current) {
      const dx = n.x - x
      const dy = n.y - y
      if (dx * dx + dy * dy < (n.radius + pad) * (n.radius + pad)) return n
    }
    return null
  }, [])

  const findNode = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) =>
      findNodeAt(e.clientX, e.clientY),
    [findNodeAt],
  )

  const applyZoom = useCallback((factor: number) => {
    const newZoom = Math.max(0.3, Math.min(3, zoomRef.current * factor))
    zoomRef.current = newZoom
    setZoomLevel(newZoom)
  }, [])

  /**
   * AGT triangle layout (matches JOE / MOA map of augments):
   *   CORE center · COG always up · EMO bottom-left · ENV bottom-right
   * Then camera centers on CORE.
   */
  const applyAgtTriangleLayout = useCallback(
    (coreId: string) => {
      const nodes = nodesRef.current
      if (!nodes.length) return
      const cx = dims.w / 2
      const cy = dims.h / 2
      // Orbit radius — clean triad like Vision / Send / Warp around Core-00
      const R = Math.min(dims.w, dims.h) * 0.3

      // Angles: COG = up (−90°), EMO = bottom-left (150°), ENV = bottom-right (30°)
      const ANGLE: Record<'COG' | 'EMO' | 'ENV', number> = {
        COG: -Math.PI / 2,
        EMO: (Math.PI * 5) / 6,
        ENV: Math.PI / 6,
      }

      const buckets: Record<'COG' | 'EMO' | 'ENV', SimNode[]> = {
        COG: [],
        EMO: [],
        ENV: [],
      }

      for (const n of nodes) {
        if (n.id === coreId) {
          // Targets only — positions ease in via simulate (no hard snap)
          n.layoutX = cx
          n.layoutY = cy
          continue
        }
        // ROOT non-core (e.g. orange tools) sit with COG ray
        const key: 'COG' | 'EMO' | 'ENV' =
          n.agt === 'EMO' ? 'EMO' : n.agt === 'ENV' ? 'ENV' : 'COG'
        buckets[key].push(n)
      }

      const place = (list: SimNode[], baseAngle: number) => {
        const count = list.length
        list.forEach((n, i) => {
          // Fan siblings slightly so they don’t stack
          const fan =
            count <= 1 ? 0 : ((i - (count - 1) / 2) * 0.32) / Math.max(count * 0.35, 1)
          const ang = baseAngle + fan
          const dist = R * (0.92 + (i % 2) * 0.1)
          n.layoutX = cx + Math.cos(ang) * dist
          n.layoutY = cy + Math.sin(ang) * dist
          // keep current x/y — smooth spring moves them
        })
      }

      place(buckets.COG, ANGLE.COG)
      place(buckets.EMO, ANGLE.EMO)
      place(buckets.ENV, ANGLE.ENV)

      layoutLockRef.current = true
      focusModeRef.current = true
      // Camera home so triad is on-screen
      panRef.current = { x: 0, y: 0 }
      zoomRef.current = 1
      setZoomLevel(1)
    },
    [dims.w, dims.h],
  )

  /** Focus ON: AGT triangle targets + select CORE. */
  const focusOnNode = useCallback(
    (id?: string | null) => {
      const coreId =
        coreIdRef.current ||
        (marketMode ? marketCoreId(xSession) : '0-core')
      const targetId =
        id && id !== MKT_HUB_ID ? id : coreId

      applyAgtTriangleLayout(coreId)
      setFocusMode(true)
      setSelectedId(targetId === MKT_HUB_ID ? coreId : targetId)
    },
    [applyAgtTriangleLayout, marketMode, xSession],
  )

  /** Focus OFF: free physics again. */
  const unfocusGraph = useCallback(() => {
    setFocusMode(false)
    focusModeRef.current = false
    layoutLockRef.current = false
    for (const n of nodesRef.current) {
      n.layoutX = undefined
      n.layoutY = undefined
      n.vx *= 0.3
      n.vy *= 0.3
    }
  }, [])

  /** Toggle Focus / Unfocus */
  const toggleFocus = useCallback(() => {
    if (focusModeRef.current || focusMode) {
      unfocusGraph()
    } else {
      focusOnNode()
    }
  }, [focusMode, focusOnNode, unfocusGraph])

  // After market graph builds, focus VIBE peer from /augments deep-link
  useEffect(() => {
    if (!marketMode || !pendingFocusHandle) return
    const id = `mkt-peer-${pendingFocusHandle.toLowerCase()}`
    if (!marketplaceGraph.nodes.some((n) => n.id === id)) return
    setSelectedId(id)
    window.requestAnimationFrame(() => {
      focusOnNode(id)
    })
    setPendingFocusHandle(null)
  }, [marketMode, pendingFocusHandle, marketplaceGraph.nodes, focusOnNode])

  /**
   * Graph node click → auto-open left sidebar + glass pay/directory cards
   * so profile / augments / pay details are immediately readable.
   */
  useEffect(() => {
    if (!marketMode || !selectedId) return
    const isPeer = selectedId.startsWith('mkt-peer-')
    const isPay = selectedId.startsWith('mkt-pay-')
    const isYou = selectedId.startsWith('mkt-you-')
    const isSkills =
      selectedId.startsWith('mkt-skills-') || selectedId.startsWith('skill-')
    if (!isPeer && !isPay && !isYou && !isSkills) return

    // Force-expand left detail panel (collapsed dock remembers LS state)
    try {
      localStorage.setItem(SB_C_KEY, '0')
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent('wealth-sidebar-expand', { detail: { id: selectedId } }),
    )

    if (isPeer || isPay) {
      marketCards.openMany(['pay', 'directory'])
    } else if (isYou) {
      marketCards.open('pay')
    } else if (isSkills) {
      marketCards.open('directory')
    }
    // marketCards.open* are stable useCallbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on selection
  }, [marketMode, selectedId])

  // Touch: pinch zoom + pan + tap select (mobile graph nav)
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)
  const touchPanRef = useRef<{
    x: number
    y: number
    px: number
    py: number
  } | null>(null)
  const touchMovedRef = useRef(false)

  const onTouchStart = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = {
        dist: Math.hypot(dx, dy),
        zoom: zoomRef.current,
      }
      touchPanRef.current = null
      setDragging(null)
      return
    }
    if (e.touches.length === 1) {
      const t = e.touches[0]
      touchMovedRef.current = false
      const n = findNodeAt(t.clientX, t.clientY)
      if (n) {
        setDragging(n)
        setSelectedId(n.id)
      } else {
        touchPanRef.current = {
          x: t.clientX,
          y: t.clientY,
          px: panRef.current.x,
          py: panRef.current.y,
        }
      }
    }
  }, [findNodeAt])

  const onTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const scale = dist / Math.max(1, pinchRef.current.dist)
        const newZoom = Math.max(
          0.3,
          Math.min(3, pinchRef.current.zoom * scale),
        )
        zoomRef.current = newZoom
        setZoomLevel(newZoom)
        return
      }
      if (e.touches.length === 1) {
        const t = e.touches[0]
        if (dragging) {
          e.preventDefault()
          touchMovedRef.current = true
          const rect = canvasRef.current?.getBoundingClientRect()
          if (rect) {
            const pan = panRef.current
            const zoom = zoomRef.current
            const sx = t.clientX - rect.left
            const sy = t.clientY - rect.top
            dragging.x =
              (sx - rect.width / 2) / zoom + rect.width / 2 - pan.x
            dragging.y =
              (sy - rect.height / 2) / zoom + rect.height / 2 - pan.y
            dragging.vx = 0
            dragging.vy = 0
          }
          return
        }
        if (touchPanRef.current) {
          e.preventDefault()
          const dx = t.clientX - touchPanRef.current.x
          const dy = t.clientY - touchPanRef.current.y
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) touchMovedRef.current = true
          panRef.current = {
            x: touchPanRef.current.px + dx,
            y: touchPanRef.current.py + dy,
          }
          setPanning(true)
        }
      }
    },
    [dragging],
  )

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length < 2) pinchRef.current = null
      if (e.touches.length === 0) {
        const wasDrag = dragging
        setDragging(null)
        touchPanRef.current = null
        setPanning(false)
        // Tap (no move) on empty = deselect; on node already selected in start
        if (
          !touchMovedRef.current &&
          wasDrag?.href &&
          e.changedTouches[0]
        ) {
          // optional: don't auto-open on touch end if already selected
        }
      }
    },
    [dragging],
  )

  const createNode = useCallback(
    (input: {
      name: string
      description: string
      tensor: Exclude<AgtKey, 'ROOT'>
      connectTo: string
      harness: CustomWealthNode['harness']
      plug?: string
    }) => {
      const node: CustomWealthNode = {
        id: `wealth-custom-${Date.now().toString(36)}`,
        name: input.name.trim().slice(0, 18),
        description: input.description.trim(),
        tensor: input.tensor,
        connectTo: input.connectTo || device.id,
        harness: input.harness,
        plug: input.plug?.trim(),
        createdAt: new Date().toISOString(),
      }
      setCustomNodes((prev) => {
        const next = [...prev, node]
        saveCustomNodes(next)
        return next
      })
      if (input.harness !== 'other' && input.harness !== 'browser') {
        markHarnessWired(input.harness, input.plug)
        setHarness(loadHarnessBindings())
      }
      setSelectedId(node.id)
    },
    [device.id],
  )

  const removeCustom = useCallback((id: string) => {
    setCustomNodes((prev) => {
      const next = prev.filter((n) => n.id !== id)
      saveCustomNodes(next)
      return next
    })
    setSelectedId((s) => (s === id ? null : s))
  }, [])

  /**
   * Remove selected graph node:
   * - custom MOA nodes → delete from local store
   * - market skills → remove listing
   * - peers / pay cards / skills hubs → hide from graph (persisted)
   * CORE (@you) / oauth cannot be removed.
   */
  const removeSelectedNode = useCallback(
    (idArg?: string | null) => {
      const id = idArg ?? selectedId
      if (!id) {
        toast.message('Select a node first')
        return
      }

      // Market skill listing
      if (marketMode && mySkills.some((s) => s.id === id)) {
        removeMarketSkill(id)
        setMarketSkills(loadMarketSkills())
        setSelectedId(marketplaceGraph.coreId)
        toast.success('Skill removed from graph')
        return
      }

      // Custom MOA node
      if (!marketMode) {
        const custom = customNodes.some((c) => c.id === id)
        if (custom) {
          removeCustom(id)
          toast.success('Node removed')
          return
        }
        toast.message('Only custom nodes can be removed on MOA')
        return
      }

      if (!canRemoveMarketNode(id)) {
        toast.message('CORE node can’t be removed')
        return
      }

      // Drop VIBE edge when removing a peer
      const peerM = id.match(/^mkt-peer-(.+)$/i)
      if (peerM && xSession) {
        removeVibeInvite(peerM[1], xSession.handle)
        setVibeInvites(loadVibeInvites())
      }

      const next = hideMarketNodes([id])
      setHiddenMarketIds(next)
      setSelectedId(marketplaceGraph.coreId)
      toast.success('Node removed · restore from market cards if needed')
    },
    [
      selectedId,
      marketMode,
      mySkills,
      customNodes,
      removeCustom,
      marketplaceGraph.coreId,
      xSession,
    ],
  )

  const restoreRemovedMarketNodes = useCallback(() => {
    clearHiddenMarketNodes()
    setHiddenMarketIds([])
    toast.success('Restored removed market nodes')
  }, [])

  // Delete / Backspace removes the selected node (when not typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const t = e.target as HTMLElement
      if (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.isContentEditable
      ) {
        return
      }
      if (showAdd) return
      e.preventDefault()
      removeSelectedNode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [removeSelectedNode, showAdd])

  const activeNode = useMemo((): SimNode | null => {
    const id = selectedId || hoveredId
    if (!id) return null
    if (id === MKT_HUB_ID) {
      const hub = marketHubNode()
      return {
        ...hub,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        pulse: 0,
        custom: false,
      }
    }
    return (
      nodesRef.current.find((n) => n.id === id) ||
      (() => {
        const d = nodeData.find((n) => n.id === id)
        if (!d) return null
        return { ...d, x: 0, y: 0, vx: 0, vy: 0, pulse: 0 }
      })()
    )
  }, [selectedId, hoveredId, nodeData, marketMode, xSession, mySkills])

  /** Bridge graph selection → glass pay card / directory focus */
  const marketFocusPeer = useMemo((): MarketFocusPeer | null => {
    if (!marketMode || !selectedId) return null
    const handle = handleFromMarketNodeId(selectedId)
    if (!handle) return null
    const node =
      nodeData.find((n) => n.id === selectedId) ||
      nodesRef.current.find((n) => n.id === selectedId)
    let kind: MarketFocusPeer['kind'] = 'other'
    if (selectedId.startsWith('mkt-peer-')) kind = 'peer'
    else if (selectedId.startsWith('mkt-pay-')) kind = 'pay'
    else if (selectedId.startsWith('mkt-you-')) kind = 'you'
    else if (selectedId.startsWith('mkt-skills-')) kind = 'skills'
    // Prefer explicit pay URL on pay node; else peer's linked pay node href
    let payUrl = node?.href ?? null
    if (!payUrl && kind === 'peer') {
      const payN = nodeData.find(
        (n) => n.id === `mkt-pay-${handle.toLowerCase()}`,
      )
      payUrl = payN?.href ?? null
    }
    return {
      handle,
      payUrl,
      note: node?.description ?? null,
      kind,
    }
  }, [marketMode, selectedId, nodeData])

  const anchors = useMemo(
    () =>
      nodeData
        .filter((n) => !n.custom)
        .map((n) => ({ id: n.id, label: n.label })),
    [nodeData],
  )

  async function runGate() {
    setGateBusy(true)
    const r = await checkJtxGate(wallet)
    setGate(r)
    setGateBusy(false)
    if (wallet.trim()) saveWalletHint(wallet)
    setDevice(probeDevice())
  }

  function runPaste() {
    const d = parseTransferPayload(pasteUrl, 'paste')
    setDecode(d)
    setPayNote(
      d.ok
        ? `Resolved · @${d.handle} · ${d.kind}`
        : d.note ?? 'Not an X Money link',
    )
  }

  async function onQrFile(file: File | null) {
    if (!file) return
    setQrBusy(true)
    setPayNote(`Decoding · ${file.name}…`)
    try {
      const result = await decodeQrFromFile(file)
      const preview = result.cropPreviewUrl ?? result.fullPreviewUrl
      if (
        result.cropPreviewUrl &&
        result.fullPreviewUrl !== result.cropPreviewUrl
      ) {
        URL.revokeObjectURL(result.fullPreviewUrl)
      }
      if (previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc)
      setPreviewSrc(preview)
      setDecode(result.decode)
      setPayNote(
        result.decode.ok
          ? `QR · @${result.decode.handle} · flat in glass`
          : result.decode.note ?? 'QR loaded · no X Money payload',
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setPayNote(`Decode failed · ${msg}`)
      if (previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc)
      setPreviewSrc(URL.createObjectURL(file))
    } finally {
      setQrBusy(false)
    }
  }

  const intent = buildDryRunIntent({
    handle: decode?.handle ?? null,
    transferUrl: decode?.transferUrl ?? null,
    kind: decode?.kind ?? null,
    wallet,
    gateOk: gate?.ok ?? null,
    jtxAmount: gate?.uiAmount ?? null,
  })

  return (
    <div
      ref={containerRef}
      className="relative h-dvh w-full overflow-hidden bg-[#050303]"
      style={{ minHeight: '100dvh' }}
    >
      {/* Canvas UI Asciify — cursor lens over graph background
          https://canvasui.dev/docs/components/asciify */}
      <Asciify
        className="absolute inset-0 z-0 h-full w-full"
        style={{ height: '100%', width: '100%' }}
        charset="ascii"
        radius={0.48}
        softness={0.92}
        scale={2}
        spacing={1}
        strength={0.95}
        baseStrength={0.08}
        followSpeed={4}
        contrast={1.25}
        brightness={0.04}
        invert={0}
        background={[0.02, 0.012, 0.02]}
        backgroundOpacity={0.12}
      >
        <div className="relative h-full w-full overflow-hidden bg-[#050303]">
          {/* Brand plate — bridged from xwealth-ui (same as jtx.chat DOJO/MOA family) */}
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: "url('/jett-optx-bg-dark.jpg')" }}
            aria-hidden
          />
          {/* Subtle MOA field dots — matches jtx.chat /dojo/moa spatial grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.14) 0.55px, transparent 0.65px)',
              backgroundSize: '18px 18px',
              backgroundPosition: 'center center',
            }}
            aria-hidden
          />
          {/* Soft AGT-tint wash + vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(168,85,247,0.09) 0%, transparent 55%), radial-gradient(ellipse 55% 50% at 50% 48%, rgba(255,105,0,0.05) 0%, transparent 50%), radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, #050303 100%)',
            }}
            aria-hidden
          />
          <canvas
            ref={canvasRef}
            className="relative z-[1] block"
            style={{
              width: dims.w,
              height: dims.h,
              cursor: panning ? 'grabbing' : hoveredId ? 'pointer' : 'grab',
              touchAction: 'none',
            }}
            onMouseMove={(e) => {
              if (panStartRef.current && !dragging) {
                const dx = e.clientX - panStartRef.current.mx
                const dy = e.clientY - panStartRef.current.my
                panRef.current = {
                  x: panStartRef.current.px + dx,
                  y: panStartRef.current.py + dy,
                }
                if (!panning && (Math.abs(dx) > 3 || Math.abs(dy) > 3))
                  setPanning(true)
                return
              }
              const n = findNode(e)
              setHoveredId(n?.id ?? null)
              if (dragging) {
                const rect = canvasRef.current?.getBoundingClientRect()
                if (rect) {
                  const pan = panRef.current
                  const zoom = zoomRef.current
                  const sx = e.clientX - rect.left
                  const sy = e.clientY - rect.top
                  dragging.x =
                    (sx - rect.width / 2) / zoom + rect.width / 2 - pan.x
                  dragging.y =
                    (sy - rect.height / 2) / zoom + rect.height / 2 - pan.y
                  dragging.vx = 0
                  dragging.vy = 0
                }
              }
            }}
            onClick={(e) => {
              if (panning) {
                setPanning(false)
                return
              }
              // Select only — never auto-open deeplinks. Sidebar has explicit Open ↗.
              setGraphMenu(null)
              const n = findNode(e)
              setSelectedId(n?.id ?? null)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const n = findNode(e)
              if (!n) {
                setGraphMenu({
                  x: e.clientX,
                  y: e.clientY,
                  nodeId: null,
                  kind: 'canvas',
                })
                return
              }
              setSelectedId(n.id)
              setGraphMenu({
                x: e.clientX,
                y: e.clientY,
                nodeId: n.id,
                kind: 'node',
              })
            }}
            onMouseDown={(e) => {
              if (e.button === 2) return
              setGraphMenu(null)
              const n = findNode(e)
              if (n) setDragging(n)
              else {
                panStartRef.current = {
                  mx: e.clientX,
                  my: e.clientY,
                  px: panRef.current.x,
                  py: panRef.current.y,
                }
              }
            }}
            onMouseUp={() => {
              if (dragging && focusMode && !layoutLockRef.current) {
                setFocusMode(false)
              }
              setDragging(null)
              panStartRef.current = null
              setPanning(false)
            }}
            onMouseLeave={() => {
              if (dragging && focusMode && !layoutLockRef.current) {
                setFocusMode(false)
              }
              setHoveredId(null)
              setDragging(null)
              panStartRef.current = null
              setPanning(false)
            }}
            onWheel={(e) => {
              e.preventDefault()
              applyZoom(e.deltaY > 0 ? 0.92 : 1.08)
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          />
        </div>
      </Asciify>

      {/* Focus dock — MOA + marketplace (mini wire + Focus/Unfocus · Add · Del) */}
      <XWealthWireMap
        spokes={
          marketMode
            ? marketplaceGraph.spokes
            : (() => {
                // One node per AGT ray for MOA mini map
                const cog = nodeData.find(
                  (n) =>
                    n.id !== '0-core' &&
                    n.id !== '8-wealth' &&
                    (n.agt === 'COG' || n.agt === 'ROOT'),
                )
                const emo = nodeData.find(
                  (n) => n.id === '8-wealth' || n.agt === 'EMO',
                )
                const env = nodeData.find(
                  (n) => n.id !== '0-core' && n.agt === 'ENV',
                )
                const out: WireMapSpoke[] = []
                if (cog)
                  out.push({ id: cog.id, label: cog.label, kind: 'you' })
                if (emo)
                  out.push({ id: emo.id, label: emo.label, kind: 'peer' })
                if (env)
                  out.push({ id: env.id, label: env.label, kind: 'peer' })
                return out
              })()
        }
        selectedId={selectedId}
        coreId={marketMode ? marketplaceGraph.coreId : '0-core'}
        hubId={marketMode ? MKT_HUB_ID : '0-core'}
        hubLabel={marketMode ? 'XW' : 'C'}
        hubFill={marketMode ? undefined : '#f97316'}
        focusMode={focusMode}
        canDelete={
          Boolean(
            (activeNode?.custom && activeNode.id) ||
              (marketMode && selectedId && canRemoveMarketNode(selectedId)) ||
              (marketMode &&
                selectedId &&
                mySkills.some((s) => s.id === selectedId)),
          )
        }
        onSelectHub={() =>
          setSelectedId(marketMode ? MKT_HUB_ID : '0-core')
        }
        onSelectSpoke={(id) => {
          setSelectedId(id)
          if (focusMode) {
            window.requestAnimationFrame(() => focusOnNode(id))
          }
        }}
        onToggleFocus={toggleFocus}
        onAdd={() => setShowAdd(true)}
        onDelete={() => removeSelectedNode()}
        marketMode={marketMode}
        marketCardSlot={
          marketMode ? (
            <MarketCardPanelControls
              visible={marketCards.visible}
              onToggle={marketCards.toggle}
              onResetLayout={marketCards.resetLayout}
              focusLabel={
                marketFocusPeer
                  ? `@${marketFocusPeer.handle}${
                      marketFocusPeer.kind && marketFocusPeer.kind !== 'other'
                        ? ` · ${marketFocusPeer.kind}`
                        : ''
                    }`
                  : null
              }
              hiddenCount={hiddenMarketIds.length}
              onRestoreHidden={
                hiddenMarketIds.length > 0
                  ? restoreRemovedMarketNodes
                  : undefined
              }
            />
          ) : null
        }
      />

      {/* Zoom chrome */}
      <div className="pointer-events-auto fixed bottom-4 right-3 z-[55] flex flex-col gap-1.5 sm:bottom-5 sm:right-4">
        <button
          type="button"
          onClick={() => applyZoom(1.15)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0a0a0c]/95 font-mono text-lg text-white/80 shadow-lg backdrop-blur-sm hover:border-orange-500/40 hover:text-orange-200"
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => applyZoom(0.87)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0a0a0c]/95 font-mono text-lg text-white/80 shadow-lg backdrop-blur-sm hover:border-orange-500/40 hover:text-orange-200"
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            zoomRef.current = 1
            panRef.current = { x: 0, y: 0 }
            setZoomLevel(1)
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0a0a0c]/95 font-mono text-[9px] uppercase tracking-wide text-white/55 shadow-lg backdrop-blur-sm hover:border-orange-500/40 hover:text-orange-200"
          aria-label="Reset view"
          title="Reset view"
        >
          1:1
        </button>
        <span className="text-center font-mono text-[9px] text-white/35">
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>

      {/* ── Header chrome (outside Asciify — stays crisp) ── */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0a0a0c] px-3 sm:gap-3 sm:px-4">
        {/* Top left: tools only (dashboard lives on top-right logo) */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowJettUX((v) => !v)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border py-1 pl-1 pr-2.5 transition',
              showJettUX
                ? 'border-orange-400/60 bg-[#ff6200]/10 shadow-[0_0_20px_rgba(255,98,0,0.35)] ring-1 ring-orange-500/40'
                : 'border-white/10 bg-white/[0.03] hover:border-orange-500/45 hover:bg-orange-500/10',
            )}
            title="Toggle Jett UX · AGT simplex HUD"
            aria-label="Toggle Jett UX"
            aria-pressed={showJettUX}
          >
            <img
              src="/astroknotsLOGO.png"
              alt=""
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-orange-500/50"
              draggable={false}
            />
            <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff8a33] sm:inline">
              Jett UX
            </span>
          </button>
          {/* Add also on dock; header shortcut for discoverability */}
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 font-mono text-[11px] text-white/60 transition-colors hover:border-orange-500/50 hover:text-white/90"
            aria-label="Add node"
          >
            <span className="text-orange-500 transition-transform group-hover:rotate-90">
              +
            </span>
            <span className="tracking-wide">Add node</span>
            <kbd className="hidden rounded border border-white/10 px-1 py-0.5 text-[9px] text-white/30 sm:inline">
              /
            </kbd>
          </button>
        </div>

        {/* Center: X | Marketplace toggle · Solana · Hermes */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (marketMode) {
                // Still need X? Re-prompt. Already signed in → leave market.
                if (!(xSession ?? loadXSession())) {
                  setShowXAuth(true)
                  return
                }
                enterMarketMode(false)
                return
              }
              // Swap on → wipe MOA · open market · prompt X sign-in
              enterMarketMode(true)
              if (!(xSession ?? loadXSession())) {
                setShowXAuth(true)
              }
            }}
            title={
              marketMode
                ? xSession
                  ? `Marketplace on as @${xSession.handle} · click to return to MOA`
                  : 'Marketplace on · sign in with X required · click to leave'
                : 'Open Augment Marketplace (sign in with X)'
            }
            aria-label={
              marketMode
                ? 'Leave marketplace graph'
                : 'Open marketplace — sign in with X'
            }
            aria-pressed={marketMode}
            className={cn(
              'group relative inline-flex h-9 max-w-[min(100vw-8rem,280px)] items-center gap-0 overflow-hidden rounded-full border transition',
              marketMode
                ? xSession
                  ? 'border-orange-400/55 bg-[#1a1008] shadow-[0_0_22px_rgba(255,98,0,0.35)]'
                  : 'border-rose-400/60 bg-[#1a0a0e] shadow-[0_0_22px_rgba(244,63,94,0.4)] animate-pulse'
                : 'border-white/15 bg-black/55 hover:border-orange-500/45 hover:bg-black/70 hover:shadow-[0_0_18px_rgba(255,98,0,0.22)]',
            )}
          >
            {/* X mark */}
            <span
              className={cn(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center',
                marketMode
                  ? xSession
                    ? 'bg-orange-500 text-black'
                    : 'bg-white text-black'
                  : 'bg-white text-black',
              )}
            >
              <img
                src="/x-logo.svg"
                alt=""
                className="h-3.5 w-3.5"
                draggable={false}
              />
            </span>
            {/* Divider */}
            <span
              className={cn(
                'h-5 w-px shrink-0',
                marketMode && xSession
                  ? 'bg-orange-400/40'
                  : marketMode
                    ? 'bg-white/25'
                    : 'bg-white/20',
              )}
              aria-hidden
            />
            {/* Label — orange glow "Marketplace" / sign-in prompt */}
            <span className="flex min-w-0 flex-1 flex-col items-start justify-center px-2.5 py-1 pr-3 text-left">
              {!marketMode && (
                <span
                  className="font-mono text-[11px] font-semibold tracking-[0.04em] text-[#ff8a33]"
                  style={{
                    textShadow:
                      '0 0 10px rgba(255,98,0,0.75), 0 0 22px rgba(255,98,0,0.4)',
                  }}
                >
                  Marketplace
                </span>
              )}
              {marketMode && !xSession && (
                <>
                  <span
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-rose-200"
                    style={{
                      textShadow: '0 0 12px rgba(244,63,94,0.7)',
                    }}
                  >
                    Sign in with X
                  </span>
                  <span className="font-mono text-[8px] text-white/45">
                    required for your pay card
                  </span>
                </>
              )}
              {marketMode && xSession && (
                <>
                  <span
                    className="font-mono text-[10px] font-semibold tracking-[0.04em] text-[#ff8a33]"
                    style={{
                      textShadow:
                        '0 0 10px rgba(255,98,0,0.7), 0 0 18px rgba(255,98,0,0.35)',
                    }}
                  >
                    Marketplace
                  </span>
                  <span className="max-w-[120px] truncate font-mono text-[8px] text-orange-100/80">
                    @{xSession.handle} · on
                  </span>
                </>
              )}
            </span>
            {/* Mini switch knob — when market on without X, small “exit” via long-title */}
            <span
              className={cn(
                'mr-1.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition',
                marketMode
                  ? 'bg-orange-500/90 justify-end'
                  : 'bg-white/15 justify-start',
              )}
              aria-hidden
            >
              <span
                className={cn(
                  'h-4 w-4 rounded-full shadow transition',
                  marketMode ? 'bg-black' : 'bg-white/80',
                )}
              />
            </span>
          </button>
          {marketMode && !xSession && (
            <button
              type="button"
              onClick={() => enterMarketMode(false)}
              title="Leave marketplace · back to Wealth MOA"
              className="hidden h-8 shrink-0 items-center rounded-full border border-white/12 bg-black/50 px-2.5 font-mono text-[9px] text-white/50 transition hover:border-white/30 hover:text-white/80 sm:inline-flex"
            >
              ← MOA
            </button>
          )}
          <a
            href={EXHIBIT.solana}
            target="_blank"
            rel="noreferrer"
            title="Solana"
            className="inline-flex h-8 items-center rounded-full border border-white/15 bg-white/5 px-2.5 ring-1 ring-white/10 transition hover:border-[#14F195]/40"
          >
            <img
              src="/solana-logo.svg"
              alt="Solana"
              className="h-3.5 w-auto"
              draggable={false}
            />
          </a>
          <a
            href={EXHIBIT.hermes}
            target="_blank"
            rel="noreferrer"
            title="Hermes Agent · Nous Research"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-transparent text-white ring-1 ring-white/10 transition hover:border-white/40 hover:bg-white/10"
          >
            <img
              src="/hermes-logo.svg"
              alt="Hermes Agent"
              className="h-[18px] w-[18px] brightness-0 invert"
              draggable={false}
            />
          </a>
          <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] text-emerald-300 sm:inline">
            dry-run
          </span>
          <PrivySignInButton
            onWallet={(addr) => {
              setWallet(addr)
              saveWalletHint(addr)
            }}
          />
          {/* Legend pill (was bottom-left footer) */}
          <div className="hidden items-center gap-3 rounded-full border border-white/12 bg-black/50 px-3 py-1 font-mono md:flex">
            {(['COG', 'EMO', 'ENV'] as const).map((key) => (
              <span key={key} className="flex items-center gap-1.5 text-[9px]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: AGT[key].color }}
                />
                <span
                  style={{ color: AGT[key].color }}
                  className="font-bold opacity-80"
                >
                  {key}
                </span>
              </span>
            ))}
            <span className="h-3 w-px bg-white/15" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-500/90">
              {marketMode ? 'Market' : 'MOA'} · {nodeData.length}
            </span>
            <span className="hidden h-3 w-px bg-white/15 lg:block" />
            <span className="hidden text-[9px] text-white/40 lg:inline">
              {device.online ? 'device online' : 'device offline'}
            </span>
          </div>
        </div>

        {/* Top right: status · logo = Dashboard views (orange glow when open) */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-2">
          <div className="hidden text-right sm:block">
            <div className="font-mono text-[11px] font-semibold tracking-wide text-white/80">
              JOE UI
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
              Wealth-08 · {marketMode ? 'Market' : 'MOA'}
            </div>
          </div>
          <DashboardMenu
            variant="logo"
            align="right"
            view={marketMode ? 'marketplace' : 'moa'}
            marketHandle={xSession?.handle ?? null}
            sessionHandle={xSession?.handle ?? null}
            onSelectMoa={() => {
              enterMarketMode(false)
            }}
            onSelectMarketplace={() => {
              enterMarketMode(true)
              if (!(xSession ?? loadXSession())) {
                setShowXAuth(true)
              }
            }}
          />
        </div>
      </header>

      {/* Jett UX right dock — card only (~210px), matches brand HUD */}
      {showJettUX && (
        <div
          className="pointer-events-auto fixed right-3 top-16 z-[60] w-[min(212px,calc(100vw-1.5rem))] sm:right-4"
          id="jett-ux-shell"
        >
          <JettUxOverlay state={agtState} live={gazeLive} />
        </div>
      )}

      {/* X OAuth / marketplace sign-in */}
      {showXAuth && (
        <XAuthModal
          onClose={() => setShowXAuth(false)}
          onSignIn={completeXSignIn}
          initialHandle={xSession?.handle}
        />
      )}

      {/* Detail sidebar — flush left; auto-expands on graph node select */}
      {activeNode ? (
        <DetailCard
          node={activeNode}
          nodeIds={nodeData.map((n) => n.id)}
          connections={[...getConnected(activeNode.id)].map(
            (id) => nodesRef.current.find((n) => n.id === id)?.label || id,
          )}
          deviceLabel={device.label}
          expandSignal={selectedId}
          harness={harness}
          onRemove={
            activeNode.custom
              ? () => removeCustom(activeNode.id)
              : marketMode && canRemoveMarketNode(activeNode.id)
                ? () => removeSelectedNode(activeNode.id)
                : undefined
          }
          tool={activeNode.tool}
          href={activeNode.href}
          wallet={wallet}
          setWallet={setWallet}
          gate={gate}
          gateBusy={gateBusy}
          runGate={() => void runGate()}
          pasteUrl={pasteUrl}
          setPasteUrl={setPasteUrl}
          runPaste={runPaste}
          decode={decode}
          previewSrc={previewSrc}
          qrBusy={qrBusy}
          payNote={payNote}
          onQrFile={(f) => void onQrFile(f)}
          intent={intent}
          marketMode={marketMode}
          xSession={xSession}
          mySkills={mySkills}
          onOpenMarket={() => {
            enterMarketMode(true)
            if (!(xSession ?? loadXSession())) setShowXAuth(true)
          }}
          onOpenXAuth={() => setShowXAuth(true)}
          onSignOutX={signOutX}
          onAddSkill={(name, blurb) => {
            if (!xSession) {
              setShowXAuth(true)
              return
            }
            saveMarketSkill({
              name,
              blurb,
              owner: xSession.handle,
            })
            setMarketSkills(loadMarketSkills())
          }}
          onRemoveSkill={(id) => {
            removeMarketSkill(id)
            setMarketSkills(loadMarketSkills())
          }}
          onWire={(h) => {
            markHarnessWired(h)
            setHarness(loadHarnessBindings())
          }}
          onJump={(id) => setSelectedId(id)}
          onOpenPayGlass={() => marketCards.openMany(['pay', 'directory'])}
          onVibePeer={(toHandle, payUrl, note) => {
            const from = xSession?.handle || loadXSession()?.handle
            if (!from) {
              setShowXAuth(true)
              return
            }
            saveVibeInvite({
              fromHandle: from,
              toHandle,
              listingId: `mkt-peer-${normalizeHandle(toHandle).toLowerCase()}`,
              payUrl: payUrl || undefined,
              note,
            })
            setVibeInvites(loadVibeInvites())
          }}
          onStartVibeDm={(toHandle) => {
            const from = xSession?.handle || loadXSession()?.handle
            if (!from) {
              setShowXAuth(true)
              return
            }
            // Ensure invite exists so it shows on the graph
            const existing = loadVibeInvites().find(
              (v) =>
                normalizeHandle(v.toHandle) === normalizeHandle(toHandle) &&
                normalizeHandle(v.fromHandle) === normalizeHandle(from),
            )
            if (!existing) {
              saveVibeInvite({
                fromHandle: from,
                toHandle,
                listingId: `mkt-peer-${normalizeHandle(toHandle).toLowerCase()}`,
              })
              setVibeInvites(loadVibeInvites())
            }
            // Build DM text with back-link to this WARP vibe view
            const vibeLink = `${window.location.origin}/warp?vibe=@${normalizeHandle(toHandle)}`
            const { url, text } = buildVibeDmUrl({
              fromHandle: from,
              toHandle,
              vibeLink,
            })
            void navigator.clipboard.writeText(text).catch(() => {})
            window.open(url, '_blank', 'noopener,noreferrer')
            toast.success(`Opening X DM · message copied`, {
              description: `Send to @${normalizeHandle(toHandle)} in the recipient field`,
              duration: 5000,
            })
          }}
        />
      ) : (
        <GuideSidebar
          gate={gate}
          decode={decode}
          expandSignal={selectedId}
          onJump={(id) => setSelectedId(id)}
        />
      )}

      {graphMenu && (
        <GraphContextMenu
          x={graphMenu.x}
          y={graphMenu.y}
          kind={graphMenu.kind}
          node={
            graphMenu.nodeId
              ? nodeData.find((n) => n.id === graphMenu.nodeId) ?? null
              : null
          }
          canDelete={Boolean(
            graphMenu.nodeId &&
              ((activeNode?.custom && activeNode.id === graphMenu.nodeId) ||
                (marketMode && canRemoveMarketNode(graphMenu.nodeId)) ||
                (marketMode &&
                  mySkills.some((s) => s.id === graphMenu.nodeId))),
          )}
          onClose={() => setGraphMenu(null)}
          onFocus={() => {
            if (graphMenu.nodeId) {
              setSelectedId(graphMenu.nodeId)
              focusOnNode(graphMenu.nodeId)
              if (!focusMode) toggleFocus()
            }
            setGraphMenu(null)
          }}
          onSelect={() => {
            if (graphMenu.nodeId) setSelectedId(graphMenu.nodeId)
            setGraphMenu(null)
          }}
          onAddNode={() => {
            setShowAdd(true)
            setGraphMenu(null)
          }}
          onCopyId={() => {
            if (graphMenu.nodeId) {
              void navigator.clipboard.writeText(graphMenu.nodeId)
            }
            setGraphMenu(null)
          }}
          onCopyLabel={() => {
            const n = graphMenu.nodeId
              ? nodeData.find((x) => x.id === graphMenu.nodeId)
              : null
            if (n?.label) void navigator.clipboard.writeText(n.label)
            setGraphMenu(null)
          }}
          onDelete={() => {
            if (!graphMenu.nodeId) return
            removeSelectedNode(graphMenu.nodeId)
            setGraphMenu(null)
          }}
          onResetView={() => {
            zoomRef.current = 1
            panRef.current = { x: 0, y: 0 }
            setZoomLevel(1)
            setGraphMenu(null)
          }}
        />
      )}

      {showAdd && (
        <AddNodeModal
          anchors={anchors}
          deviceId={device.id}
          onClose={() => setShowAdd(false)}
          onCreate={(input) => {
            createNode(input)
            setShowAdd(false)
          }}
        />
      )}

      {/* Market mode: glass popout cards over MDX/graph field (auto-open on node click) */}
      {marketMode ? (
        <WarpMarketFloatingCards
          visible={marketCards.visible}
          layout={marketCards.layout}
          onToggle={marketCards.toggle}
          onLayout={marketCards.setCardLayout}
          focusPeer={marketFocusPeer}
        />
      ) : null}

    </div>
  )
}

/* ─── Left sidebar: drag edge resize + collapse ─────────────────────────── */

const SB_W_KEY = 'wealth-moa-sidebar-w'
const SB_C_KEY = 'wealth-moa-sidebar-collapsed'
const SB_MIN = 280
const SB_MAX = 720
const SB_DEFAULT = 420

function useSidebarLeftOffset() {
  const [left, setLeft] = useState(SB_DEFAULT + 12)
  useEffect(() => {
    const read = () => {
      try {
        if (localStorage.getItem(SB_C_KEY) === '1') {
          setLeft(36 + 12)
          return
        }
        const n = Number(localStorage.getItem(SB_W_KEY))
        const w =
          Number.isFinite(n) && n >= SB_MIN && n <= SB_MAX ? n : SB_DEFAULT
        setLeft(w + 12)
      } catch {
        setLeft(SB_DEFAULT + 12)
      }
    }
    read()
    const id = window.setInterval(read, 400)
    window.addEventListener('storage', read)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('storage', read)
    }
  }, [])
  return left
}

const WIREMAP_POS_KEY = 'xwealth-wiremap-dock-pos-v1'

type WireMapPos = { x: number; y: number }

function loadWireMapPos(defaultX: number, defaultY: number): WireMapPos {
  if (typeof window === 'undefined') return { x: defaultX, y: defaultY }
  try {
    const raw = localStorage.getItem(WIREMAP_POS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as WireMapPos
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
        return clampWireMapPos(p.x, p.y)
      }
    }
  } catch {
    /* ignore */
  }
  return { x: defaultX, y: defaultY }
}

function clampWireMapPos(x: number, y: number, w = 168, h = 280): WireMapPos {
  if (typeof window === 'undefined') return { x, y }
  const maxX = Math.max(8, window.innerWidth - w - 8)
  const maxY = Math.max(8, window.innerHeight - Math.min(h, 120) - 8)
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(8, y)),
  }
}

/**
 * Compact graph dock — mini wire + Focus/Unfocus · Add · Delete.
 * Draggable around the graph canvas (position persisted).
 * Shown on MOA and marketplace.
 */
function XWealthWireMap({
  spokes,
  selectedId,
  coreId,
  hubId = MKT_HUB_ID,
  hubLabel = 'XW',
  hubFill,
  focusMode,
  canDelete,
  onSelectHub,
  onSelectSpoke,
  onToggleFocus,
  onAdd,
  onDelete,
  marketMode = false,
  marketCardSlot = null,
}: {
  spokes: WireMapSpoke[]
  selectedId: string | null
  coreId: string
  hubId?: string
  hubLabel?: string
  hubFill?: string
  focusMode: boolean
  canDelete: boolean
  onSelectHub: () => void
  onSelectSpoke: (id: string) => void
  onToggleFocus: () => void
  onAdd: () => void
  onDelete: () => void
  marketMode?: boolean
  marketCardSlot?: ReactNode
}) {
  const left = useSidebarLeftOffset()
  const defaultX = marketMode ? 12 : left
  const defaultY = 60 // ~ top-[3.75rem]
  const [pos, setPos] = useState<WireMapPos>(() =>
    loadWireMapPos(defaultX, defaultY),
  )
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    ox: number
    oy: number
    px: number
    py: number
    moved: boolean
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  // Re-home when sidebar width changes (MOA mode) if user hasn't dragged yet
  useEffect(() => {
    if (marketMode) return
    try {
      if (!localStorage.getItem(WIREMAP_POS_KEY)) {
        setPos(clampWireMapPos(left, defaultY))
      }
    } catch {
      /* ignore */
    }
  }, [left, marketMode, defaultY])

  useEffect(() => {
    try {
      localStorage.setItem(WIREMAP_POS_KEY, JSON.stringify(pos))
    } catch {
      /* ignore */
    }
  }, [pos])

  // Keep dock on-screen on resize
  useEffect(() => {
    function onResize() {
      setPos((p) => {
        const el = panelRef.current
        const h = el?.offsetHeight ?? 280
        return clampWireMapPos(p.x, p.y, 168, h)
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onDragPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      // Only primary button / touch
      if (e.button !== 0 && e.pointerType === 'mouse') return
      // Don't start panel drag from interactive controls (buttons, links)
      const t = e.target as HTMLElement
      if (t.closest('button, a, input, textarea, select, [data-no-drag]')) return
      e.preventDefault()
      e.stopPropagation()
      const el = panelRef.current
      dragRef.current = {
        ox: e.clientX,
        oy: e.clientY,
        px: pos.x,
        py: pos.y,
        moved: false,
      }
      setDragging(true)
      el?.setPointerCapture?.(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current
        if (!d) return
        const dx = ev.clientX - d.ox
        const dy = ev.clientY - d.oy
        if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
        const h = panelRef.current?.offsetHeight ?? 280
        setPos(clampWireMapPos(d.px + dx, d.py + dy, 168, h))
      }
      const onUp = (ev: PointerEvent) => {
        dragRef.current = null
        setDragging(false)
        el?.releasePointerCapture?.(ev.pointerId)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [pos.x, pos.y],
  )

  const mapSpokes = spokes.filter(
    (s) => s.kind === 'you' || s.kind === 'peer' || s.kind === 'oauth',
  )

  // Same triad as Focus layout — 3 AGTs only (not 4 compass points)
  // COG ↑ · EMO ↙ · ENV ↘
  const AGT_RAYS = [
    { key: 'COG' as const, ang: -Math.PI / 2, color: '#eab308', dim: 'rgba(234,179,8,0.35)' },
    { key: 'EMO' as const, ang: (Math.PI * 5) / 6, color: '#f43f5e', dim: 'rgba(244,63,94,0.35)' },
    { key: 'ENV' as const, ang: Math.PI / 6, color: '#60a5fa', dim: 'rgba(96,165,250,0.35)' },
  ]

  // One node per AGT ray: COG top = single yellow only (you/oauth).
  // Peers only EMO ↙ + ENV ↘ — never a second top node.
  const buckets: Record<'COG' | 'EMO' | 'ENV', WireMapSpoke | null> = {
    COG: null,
    EMO: null,
    ENV: null,
  }
  const you =
    mapSpokes.find((s) => s.kind === 'you' || s.id === coreId) ||
    mapSpokes.find((s) => s.kind === 'oauth') ||
    null
  if (you) buckets.COG = you
  const peers = mapSpokes.filter((s) => s !== you && s.kind === 'peer')
  if (peers[0]) buckets.EMO = peers[0]
  if (peers[1]) buckets.ENV = peers[1]
  // Extra peers (2+) stay on canvas only — mini map stays a clean triad

  const size = 112
  const cx = size / 2
  const cy = size / 2
  const rHub = 15
  const rOrbit = 40

  return (
    <div
      ref={panelRef}
      className={cn(
        'pointer-events-auto fixed z-[52] w-[168px] select-none',
        dragging && 'cursor-grabbing',
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className={cn(
          'overflow-hidden rounded-xl border shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-xl',
          marketMode
            ? 'border-white/20 bg-black/40'
            : 'border-white/12 bg-[#0a0a0c]/85',
        )}
      >
        {/* Drag handle — move dock around the graph */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag mini map around the graph"
          title="Drag to move · click nodes to select"
          onPointerDown={onDragPointerDown}
          className={cn(
            'flex cursor-grab items-center justify-between gap-1 border-b border-white/10 px-2 py-1 active:cursor-grabbing',
            dragging && 'cursor-grabbing bg-white/[0.04]',
          )}
        >
          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Drag
          </span>
          <span className="font-mono text-[8px] text-white/30" aria-hidden>
            ⠿
          </span>
        </div>

        {/* AGT triad — one yellow top, one red ↙, one blue ↘ (also drag surface) */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto block cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="X Wealth AGT map · COG yellow up · EMO bottom-left · ENV bottom-right · drag to move dock"
          onPointerDown={onDragPointerDown}
        >
          {AGT_RAYS.map((ray) => {
            const tipX = cx + Math.cos(ray.ang) * rOrbit
            const tipY = cy + Math.sin(ray.ang) * rOrbit
            const s = buckets[ray.key]
            return (
              <g key={ray.key}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={tipX}
                  y2={tipY}
                  stroke={ray.dim}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />
                {!s && (
                  <circle
                    cx={tipX}
                    cy={tipY}
                    r={4}
                    fill="transparent"
                    stroke={ray.color}
                    strokeWidth={1.1}
                    opacity={0.5}
                  >
                    <title>{ray.key}</title>
                  </circle>
                )}
                {s && (
                  <circle
                    cx={tipX}
                    cy={tipY}
                    r={ray.key === 'COG' ? 7.5 : 6.5}
                    fill={
                      s.kind === 'peer'
                        ? WEALTH_PURPLE
                        : ray.color
                    }
                    stroke={
                      selectedId === s.id && s.kind === 'peer'
                        ? AGT.EMO.color
                        : selectedId === s.id
                          ? 'rgba(255,255,255,0.9)'
                          : 'rgba(255,255,255,0.28)'
                    }
                    strokeWidth={
                      selectedId === s.id
                        ? s.kind === 'peer'
                          ? 2.25
                          : 1.75
                        : 1.1
                    }
                    className="cursor-pointer"
                    data-no-drag
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onSelectSpoke(s.id)
                    }}
                    onPointerDown={(ev) => {
                      // Keep node clicks from starting a dock drag
                      ev.stopPropagation()
                    }}
                  >
                    <title>
                      {s.label} · {ray.key}
                      {s.kind === 'peer' ? ' · purple peer' : ''}
                    </title>
                  </circle>
                )}
              </g>
            )
          })}
          <g
            className="cursor-pointer"
            data-no-drag
            onClick={(ev) => {
              ev.stopPropagation()
              onSelectHub()
            }}
            onPointerDown={(ev) => {
              ev.stopPropagation()
            }}
            role="button"
            aria-label={hubLabel === 'C' ? 'Core-00' : 'X Wealth hub'}
          >
            <circle
              cx={cx}
              cy={cy}
              r={rHub}
              fill={
                hubFill
                  ? selectedId === hubId
                    ? '#fb923c'
                    : hubFill
                  : selectedId === hubId
                    ? '#f43f5e'
                    : '#9f1239'
              }
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.3}
            />
            <text
              x={cx}
              y={cy + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="8"
              fontWeight="700"
              fontFamily="ui-monospace, monospace"
              className="pointer-events-none"
            >
              {hubLabel}
            </text>
          </g>
        </svg>

        {/* Focus / Unfocus · Add · Delete */}
        <div className="flex border-t border-white/10">
          <button
            type="button"
            onClick={onToggleFocus}
            aria-pressed={focusMode}
            title={
              focusMode
                ? 'Unfocus · free graph layout'
                : 'Focus · smooth AGT triad · COG↑ EMO↙ ENV↘'
            }
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-wide transition',
              focusMode
                ? 'bg-orange-500/20 text-orange-200 hover:bg-orange-500/30'
                : 'text-orange-300 hover:bg-orange-500/15',
            )}
          >
            <span className="text-[11px] leading-none">◎</span>
            {focusMode ? 'Unfocus' : 'Focus'}
          </button>
          <button
            type="button"
            onClick={onAdd}
            title="Add node"
            className="flex flex-1 flex-col items-center gap-0.5 border-x border-white/10 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <span className="text-[12px] leading-none text-orange-400">+</span>
            Add
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            title={
              canDelete
                ? marketMode
                  ? 'Delete selected peer / pay card / skill (Delete key)'
                  : 'Delete selected custom node (Delete key)'
                : marketMode
                  ? 'Select a peer, pay card, or skill — CORE cannot be deleted'
                  : 'Select a custom node to delete'
            }
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-wide text-rose-300/90 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span className="text-[12px] leading-none">−</span>
            Del
          </button>
        </div>
        {/* Market mode: pop-out / pop-in glass augment cards */}
        {marketCardSlot}
      </div>
    </div>
  )
}

function LeftSidebarShell({
  children,
  expandSignal,
}: {
  children: ReactNode
  /** When this changes (graph node id), force-expand the sidebar */
  expandSignal?: string | null
}) {
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return SB_DEFAULT
    const n = Number(localStorage.getItem(SB_W_KEY))
    return Number.isFinite(n) && n >= SB_MIN && n <= SB_MAX ? n : SB_DEFAULT
  })
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SB_C_KEY) === '1'
  })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  const lastExpandRef = useRef<string | null | undefined>(undefined)

  // Graph click / selection → always show detail panel
  useEffect(() => {
    if (expandSignal == null) return
    if (lastExpandRef.current === expandSignal) return
    lastExpandRef.current = expandSignal
    setCollapsed(false)
  }, [expandSignal])

  useEffect(() => {
    const onExpand = () => setCollapsed(false)
    window.addEventListener('wealth-sidebar-expand', onExpand)
    return () => window.removeEventListener('wealth-sidebar-expand', onExpand)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SB_W_KEY, String(width))
    } catch {
      /* ignore */
    }
  }, [width])

  useEffect(() => {
    try {
      localStorage.setItem(SB_C_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const next = Math.min(
        SB_MAX,
        Math.max(SB_MIN, d.startW + (e.clientX - d.startX)),
      )
      setWidth(next)
    }
    const onUp = () => {
      dragRef.current = null
      setDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragging])

  if (collapsed) {
    return (
      <div className="pointer-events-auto fixed bottom-0 left-0 top-14 z-50 flex w-9 flex-col items-center border-r border-white/12 bg-[#0a0a0c] py-2 shadow-[8px_0_24px_rgba(0,0,0,0.45)]">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex h-9 w-7 items-center justify-center rounded-md border border-white/12 text-white/55 transition hover:border-orange-500/40 hover:text-orange-300"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <span className="font-mono text-[12px]">›</span>
        </button>
        <span
          className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30"
          style={{ writingMode: 'vertical-rl' }}
        >
          panel
        </span>
      </div>
    )
  }

  return (
    <div
      className="pointer-events-auto fixed bottom-0 left-0 top-14 z-50 flex max-w-[100vw] flex-col overflow-hidden border-r border-white/12 bg-[#0a0a0c] font-mono shadow-[12px_0_40px_rgba(0,0,0,0.55)]"
      style={{ width: Math.min(width, typeof window !== 'undefined' ? window.innerWidth : width) }}
    >
      {/* Collapse control */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-2.5 py-1">
        <span className="text-[9px] uppercase tracking-[0.16em] text-white/40">
          Sidebar
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/50 transition hover:border-orange-500/40 hover:text-orange-200"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          ‹ hide
        </button>
      </div>

      {/* Fill height so inner JSON panels can expand to bottom (less page scroll) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden [text-rendering:geometricPrecision]">
        {children}
      </div>

      {/* Drag edge — click-drag to resize; double-click collapses */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        title="Drag right edge to widen · double-click to collapse"
        onMouseDown={(e) => {
          e.preventDefault()
          dragRef.current = { startX: e.clientX, startW: width }
          setDragging(true)
        }}
        onDoubleClick={() => setCollapsed(true)}
        className={cn(
          'absolute bottom-0 right-0 top-0 z-20 w-2 cursor-col-resize touch-none',
          'bg-transparent hover:bg-orange-500/35',
          dragging && 'bg-orange-500/50',
        )}
      >
        <div
          className={cn(
            'absolute inset-y-0 right-0 w-px bg-white/15',
            dragging && 'bg-orange-400/80',
          )}
        />
        {/* Grab affordance mid-edge */}
        <div className="absolute right-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-l bg-white/25" />
      </div>
    </div>
  )
}

/* ─── Detail card ───────────────────────────────────────────────────────── */

function DetailCard({
  node,
  nodeIds,
  connections,
  deviceLabel,
  expandSignal,
  harness,
  onRemove,
  tool,
  href,
  wallet,
  setWallet,
  gate,
  gateBusy,
  runGate,
  pasteUrl,
  setPasteUrl,
  runPaste,
  decode,
  previewSrc,
  qrBusy,
  payNote,
  onQrFile,
  intent,
  marketMode,
  xSession,
  mySkills,
  onOpenMarket,
  onOpenXAuth,
  onSignOutX,
  onAddSkill,
  onRemoveSkill,
  onWire,
  onJump,
  onOpenPayGlass,
  onVibePeer,
  onStartVibeDm,
}: {
  node: SimNode
  nodeIds: string[]
  connections: string[]
  deviceLabel: string
  expandSignal?: string | null
  harness: HarnessBinding[]
  onRemove?: () => void
  tool?: SeedNode['tool']
  href?: string
  wallet: string
  setWallet: (v: string) => void
  gate: JtxGateResult | null
  gateBusy: boolean
  runGate: () => void
  pasteUrl: string
  setPasteUrl: (v: string) => void
  runPaste: () => void
  decode: TransferResolve | null
  previewSrc: string
  qrBusy: boolean
  payNote: string
  onQrFile: (file: File | null) => void
  intent: ReturnType<typeof buildDryRunIntent>
  marketMode: boolean
  xSession: XSession | null
  mySkills: MarketSkill[]
  onOpenMarket: () => void
  onOpenXAuth: () => void
  onSignOutX: () => void
  onAddSkill: (name: string, blurb: string) => void
  onRemoveSkill: (id: string) => void
  onWire: (h: CustomWealthNode['harness']) => void
  onJump: (id: string) => void
  onOpenPayGlass?: () => void
  onVibePeer?: (handle: string, payUrl?: string | null, note?: string) => void
  /** Open X DM compose with pre-filled VIBE message for this peer */
  onStartVibeDm?: (handle: string) => void
}) {
  const agt = colorForNode(node)
  const idx = Math.max(0, nodeIds.indexOf(node.id))
  const prevId = nodeIds[(idx - 1 + nodeIds.length) % nodeIds.length]
  const nextId = nodeIds[(idx + 1) % nodeIds.length]
  const peerHandle = handleFromMarketNodeId(node.id)
  const wiredHarnesses = harness.filter((h) => h.wired)
  const isOwnPay =
    tool === 'market-pay' &&
    xSession &&
    peerHandle &&
    normalizeHandle(peerHandle).toLowerCase() ===
      normalizeHandle(xSession.handle).toLowerCase()

  const fillHeight =
    tool === 'intent' ||
    tool === 'pay' ||
    tool === 'gate' ||
    tool === 'market-pay' ||
    tool === 'market-skills'

  return (
    <LeftSidebarShell expandSignal={expandSignal}>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col p-3 sm:p-4',
          fillHeight ? 'overflow-hidden' : 'overflow-y-auto',
        )}
      >
        {/* Mobile / a11y: step through MOA nodes */}
        <div className="mb-2 flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onJump(prevId)}
            className="rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/70 hover:border-orange-500/40 hover:text-orange-200"
            aria-label="Previous node"
          >
            ← Prev
          </button>
          <span className="flex-1 text-center font-mono text-[9px] text-white/35">
            {idx + 1} / {nodeIds.length}
          </span>
          <button
            type="button"
            onClick={() => onJump(nextId)}
            className="rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/70 hover:border-orange-500/40 hover:text-orange-200"
            aria-label="Next node"
          >
            Next →
          </button>
        </div>

        <div className="mb-1.5 flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/55">
              {marketMode
                ? 'MARKET'
                : node.custom
                  ? 'CUSTOM'
                  : 'NODE'}{' '}
              · {node.id === '8-wealth' ? 'PURPLE' : node.agt}
            </p>
            <h2 className="mt-0.5 text-base font-semibold tracking-tight text-white">
              {node.label}
            </h2>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded border border-rose-400/30 px-2 py-0.5 text-[10px] text-rose-200/80 hover:border-rose-400/60 hover:bg-rose-500/15 hover:text-rose-100"
              title="Remove this node from the graph (Delete key)"
            >
              remove
            </button>
          )}
        </div>
        <p className="mb-2 shrink-0 text-[12px] leading-relaxed text-white/85">
          {node.description}
        </p>

        {/* Always show path cards on hub; short tips on tools */}
        {(tool === 'hub' || !tool) && (
          <HowToCards
            gate={gate}
            decode={decode}
            onJump={onJump}
            compact={false}
          />
        )}

        <div className="mb-3 mt-3">
          <p className="mb-1 text-[9px] uppercase tracking-wider text-orange-500/80">
            Edges · device {deviceLabel}
          </p>
          <div className="flex flex-wrap gap-1">
            {connections.length === 0 && (
              <span className="text-[10px] text-white/30">no edges</span>
            )}
            {connections.map((c) => (
              <span
                key={c}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-white/60"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {tool === 'gate' && (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-white/10 pt-3">
            <InfoCard title="How this works" tone="green">
              <strong className="text-white">L1</strong> Sign in with Jett Optics
              (Privy — X / email / wallet).{' '}
              <strong className="text-white">L2</strong> Hold ≥1 $JTX on the linked
              Solana wallet (or paste pubkey). PASS unlocks dry-run tools. LIVE stays
              blocked.
            </InfoCard>
            <div className="flex flex-wrap items-center gap-2">
              <PrivySignInButton
                onWallet={(addr) => {
                  setWallet(addr)
                  saveWalletHint(addr)
                }}
              />
              <span className="font-mono text-[9px] text-white/40">
                or paste pubkey below
              </span>
            </div>
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="Solana pubkey"
              className="w-full rounded-lg border border-white/15 bg-[#121216] px-3 py-2.5 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-orange-400/50"
            />
            <button
              type="button"
              onClick={runGate}
              disabled={gateBusy}
              className="w-full rounded-lg bg-orange-500 py-2.5 text-[12px] font-medium text-black disabled:opacity-50"
            >
              {gateBusy ? '…' : 'Check JTX ≥1'}
            </button>
            {gate && (
              <p
                className={cn(
                  'text-[12px] font-medium',
                  gate.ok ? 'text-emerald-300' : 'text-amber-200',
                )}
              >
                {gate.ok ? `PASS · ${gate.uiAmount} JTX` : gate.error}
              </p>
            )}
            {wallet.trim() && (
              <CopyButton text={wallet.trim()} label="Copy wallet" />
            )}
            <InfoCard title="Agent harness CLI" tone="purple">
              <pre className="mb-2 whitespace-pre-wrap text-[11px] leading-snug text-violet-50">
{`export SOLANA_WALLET=<pubkey>
npm run check-jtx
# exit 0 = pass`}
              </pre>
              <CopyButton
                text={`export SOLANA_WALLET=<pubkey>\nnpm run check-jtx\n# exit 0 = pass`}
                label="Copy CLI"
              />
            </InfoCard>
          </div>
        )}

        {tool === 'pay' && (
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 pt-3">
            <XMoneyPayPanel
              pasteUrl={pasteUrl}
              setPasteUrl={setPasteUrl}
              runPaste={runPaste}
              decode={decode}
              previewSrc={previewSrc}
              qrBusy={qrBusy}
              payNote={payNote}
              onQrFile={onQrFile}
              gate={gate}
              onJump={onJump}
              onOpenMarket={onOpenMarket}
              xSession={xSession}
            />
          </div>
        )}

        {/* ── Augment marketplace node panels ── */}
        {tool === 'market-hub' && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <InfoCard title="Augment marketplace" tone="purple">
              X Wealth is the hub. When people add this augment (and OAuth with
              X), their @handle and agentic pay card connect here so others can
              find skills and dry-run pay intents.
            </InfoCard>
            {xSession ? (
              <InfoCard title="You are listed" tone="green">
                @{xSession.handle} · signed in · edges light as peers join.
              </InfoCard>
            ) : (
              <button
                type="button"
                onClick={onOpenXAuth}
                className="w-full rounded-lg bg-rose-500 py-2.5 text-[12px] font-medium text-white"
              >
                Sign in with X to join
              </button>
            )}
          </div>
        )}

        {tool === 'market-oauth' && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <InfoCard title="X client OAuth" tone="amber">
              Required for marketplace presence. Jett Optics X app issues the
              token; your username becomes an MDX graph node with an Agentic
              pay card. Exhibit uses a local OAuth stub until live redirect is
              wired.
            </InfoCard>
            <button
              type="button"
              onClick={onOpenXAuth}
              className="w-full rounded-lg bg-white py-2.5 text-[12px] font-semibold text-black"
            >
              Continue with X
            </button>
            <a
              href={EXHIBIT.xDev}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-[10px] text-white/45 hover:text-white/70"
            >
              developer.x.com ↗
            </a>
          </div>
        )}

        {tool === 'market-you' && xSession && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <InfoCard title="Your marketplace node" tone="purple">
              @{xSession.handle}
              {xSession.displayName && xSession.displayName !== xSession.handle
                ? ` · ${xSession.displayName}`
                : ''}
              <br />
              <span className="text-white/55">
                Signed in {new Date(xSession.signedInAt).toLocaleString()} ·{' '}
                {xSession.method}
              </span>
            </InfoCard>
            <JumpBtn
              onClick={() =>
                onJump(`mkt-pay-${normalizeHandle(xSession.handle).toLowerCase()}`)
              }
            >
              Open Agentic pay card →
            </JumpBtn>
            <JumpBtn
              onClick={() =>
                onJump(
                  `mkt-skills-${normalizeHandle(xSession.handle).toLowerCase()}`,
                )
              }
            >
              List agent skills →
            </JumpBtn>
            <button
              type="button"
              onClick={onSignOutX}
              className="w-full rounded-lg border border-white/15 py-2 text-[11px] text-white/55 hover:border-rose-400/40 hover:text-rose-200"
            >
              Sign out of X
            </button>
          </div>
        )}

        {tool === 'market-pay' && (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-white/10 pt-3">
            <InfoCard title="Agentic pay card" tone="purple">
              {isOwnPay || !peerHandle
                ? 'Your listed pay surface. Decode QR / paste; local harness attaches USDC signature. LIVE settle stays blocked.'
                : `Pay card for @${peerHandle}. Review rails here · agent in local harness signs USDC dry-run only.`}
            </InfoCard>
            {peerHandle && (
              <div className="rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2">
                <p className="text-[9px] uppercase tracking-wide text-white/40">
                  Profile
                </p>
                <p className="text-[13px] font-semibold text-white">
                  @{peerHandle}
                </p>
                {href && (
                  <p className="mt-1 break-all text-[10px] text-sky-300/85">
                    {href}
                  </p>
                )}
              </div>
            )}
            <InfoCard title="Local harness · USDC" tone="green">
              {wiredHarnesses.length > 0 ? (
                <>
                  Wired on this device:{' '}
                  <strong className="text-white">
                    {wiredHarnesses.map((h) => h.harness).join(', ')}
                  </strong>
                  . Agent stays in local harness — facilitates payment intent and
                  signs off USDC send (dry-run). No live chain submit from this UI.
                </>
              ) : (
                <>
                  No harness marked wired yet. Wire Grok / Hermes / Claude on the
                  Plugin node so the agent stays in your local harness when
                  signing USDC dry-run intents.
                </>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(['hermes', 'grok', 'claude', 'cursor'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onWire(h)}
                    className="rounded-full border border-orange-500/35 bg-orange-500/10 px-2 py-0.5 text-[9px] text-orange-100"
                  >
                    wire {h}
                  </button>
                ))}
              </div>
            </InfoCard>
            {onOpenPayGlass && (
              <button
                type="button"
                onClick={onOpenPayGlass}
                className="w-full rounded-lg border border-orange-400/40 bg-orange-500/15 py-2 text-[11px] font-medium text-orange-100"
              >
                Pop out glass pay card →
              </button>
            )}
            {(isOwnPay || !peerHandle) && (
              <XMoneyPayPanel
                pasteUrl={pasteUrl}
                setPasteUrl={setPasteUrl}
                runPaste={runPaste}
                decode={decode}
                previewSrc={previewSrc}
                qrBusy={qrBusy}
                payNote={payNote}
                onQrFile={onQrFile}
                gate={gate}
                onJump={onJump}
                onOpenMarket={onOpenMarket}
                xSession={xSession}
                compact
              />
            )}
            {!isOwnPay && peerHandle && (
              <div className="space-y-2">
                <JumpBtn
                  onClick={() => onJump(`mkt-peer-${peerHandle.toLowerCase()}`)}
                >
                  Back to @{peerHandle} profile →
                </JumpBtn>
                {href && (
                  <>
                    <CopyButton text={href} label="Copy pay / profile link" primary />
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-white/15 py-2 text-center text-[11px] text-white/70 hover:border-sky-400/40"
                    >
                      Open link ↗
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {tool === 'market-skills' && (
          <MarketSkillsPanel
            xSession={xSession}
            skills={mySkills}
            onOpenXAuth={onOpenXAuth}
            onAdd={onAddSkill}
            onRemove={onRemoveSkill}
          />
        )}

        {tool === 'market-skill' && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <InfoCard title="Listed agent skill" tone="blue">
              {node.description}
            </InfoCard>
            <p className="text-[11px] text-white/50">
              Other users discover this under the owner&apos;s catalog on the
              X Wealth hub.
            </p>
          </div>
        )}

        {tool === 'market-peer' && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <InfoCard title="Peer profile" tone="blue">
              {peerHandle ? (
                <>
                  <strong className="text-white">@{peerHandle}</strong>
                  <br />
                  <span className="text-white/70">{node.description}</span>
                </>
              ) : (
                node.description
              )}
            </InfoCard>
            <div className="grid grid-cols-2 gap-1.5">
              <JumpBtn
                onClick={() => {
                  if (!peerHandle) return
                  onJump(`mkt-pay-${peerHandle.toLowerCase()}`)
                  onOpenPayGlass?.()
                }}
              >
                Pay card →
              </JumpBtn>
              <JumpBtn
                onClick={() => {
                  if (!peerHandle) return
                  onJump(`mkt-skills-${peerHandle.toLowerCase()}`)
                }}
              >
                Augments →
              </JumpBtn>
            </div>
            {onOpenPayGlass && (
              <button
                type="button"
                onClick={onOpenPayGlass}
                className="w-full rounded-lg border border-orange-400/40 bg-orange-500/15 py-2 text-[11px] font-medium text-orange-100"
              >
                Open glass pay overlay →
              </button>
            )}
            {xSession && peerHandle && onVibePeer && (
              <button
                type="button"
                onClick={() =>
                  onVibePeer(peerHandle, href, node.description)
                }
                className="w-full rounded-lg border border-rose-400/35 bg-rose-500/15 py-2 text-[11px] font-medium text-rose-100"
              >
                VIBE · connect nodes
              </button>
            )}
            {xSession && peerHandle && onStartVibeDm && (
              <button
                type="button"
                onClick={() => onStartVibeDm(peerHandle)}
                className="w-full rounded-lg border border-sky-400/35 bg-sky-500/10 py-2 text-[11px] font-medium text-sky-200 hover:bg-sky-500/20"
                title={`Open X DM compose pre-filled with a VIBE message for @${peerHandle}`}
              >
                Start VIBE → X DM ✉
              </button>
            )}
            {(href || peerHandle) && (
              <a
                href={href || `https://x.com/${peerHandle}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-white/15 py-2 text-center text-[11px] text-white/70 hover:border-rose-400/40"
              >
                Open on X ↗
              </a>
            )}
            <InfoCard title="Agent rails" tone="purple">
              Click their pay card on the graph (or above) — your local harness
              facilitates the dry-run and signs off the USDC intent. LIVE stays
              blocked on this exhibit.
            </InfoCard>
          </div>
        )}

        {tool === 'intent' && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto border-t border-white/15 pt-3">
            <InfoCard title="How this works">
              Builds a dry-run intent from gate + X Money. Copy into Hermes /
              Grok. LIVE is always blocked on this exhibit. Drag the bottom of
              the JSON box down to expand.
            </InfoCard>
            {/* Selectable JSON; drag bottom grip down to grow the box */}
            <ExpandableCode
              value={JSON.stringify(intent, null, 2)}
              className="shrink-0"
            />
            <CopyButton
              text={JSON.stringify(intent, null, 2)}
              label="Copy dry-run JSON"
              primary
            />
          </div>
        )}

        {tool === 'plugin' && (
          <div className="space-y-2 border-t border-white/15 pt-3">
            <InfoCard title="How this works" tone="purple">
              Install the public skill on your AI harness, then mark that
              harness wired so the graph edge lights on this device.
            </InfoCard>
            <pre className="mb-2 rounded-lg border border-white/10 bg-[#0e0e12] p-3 text-[11px] text-emerald-100">
              npx skills add jettoptx/jettoptx-xwealth
            </pre>
            <CopyButton
              text="npx skills add jettoptx/jettoptx-xwealth"
              label="Copy install"
              primary
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(['hermes', 'grok', 'claude', 'cursor'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onWire(h)}
                  className="rounded-full border border-orange-500/40 bg-orange-500/15 px-2.5 py-1 text-[10px] text-orange-100"
                >
                  wire {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {tool === 'agents' && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <InfoCard title="How this works" tone="blue">
              Agents hub lists x402 paid JOE APIs. This is the storefront edge
              from Wealth.
            </InfoCard>
            <a
              href={EXHIBIT.agentsHub}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-white/15 py-2 text-center text-[11px] text-white/70 hover:border-orange-500/40"
            >
              Open agents hub ↗
            </a>
          </div>
        )}

        {(tool === 'link' || href) && href && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <InfoCard title="Deeplink">
              Graph click only selects this node. Leave Wealth via the button
              below when you want a new tab.
            </InfoCard>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg bg-orange-500/90 py-2.5 text-center text-[11px] font-medium text-black"
            >
              Open {node.label} ↗
            </a>
          </div>
        )}

        {node.harness && !tool && (
          <button
            type="button"
            onClick={() => onWire(node.harness as CustomWealthNode['harness'])}
            className="mt-2 w-full rounded-lg border border-orange-500/30 bg-orange-500/10 py-2 text-[10px] text-orange-200"
          >
            Mark {node.harness} wired on this device
          </button>
        )}

        <div
          className="mt-3 h-0.5 rounded-full"
          style={{ background: agt.color, opacity: 0.5 }}
        />
      </div>
    </LeftSidebarShell>
  )
}

/* ─── X Money: agent cards + glass QR stage ─────────────────────────────── */

function XMoneyPayPanel({
  pasteUrl,
  setPasteUrl,
  runPaste,
  decode,
  previewSrc,
  qrBusy,
  payNote,
  onQrFile,
  gate,
  onJump,
  onOpenMarket,
  xSession,
  compact,
}: {
  pasteUrl: string
  setPasteUrl: (v: string) => void
  runPaste: () => void
  decode: TransferResolve | null
  previewSrc: string
  qrBusy: boolean
  payNote: string
  onQrFile: (file: File | null) => void
  gate: JtxGateResult | null
  onJump: (id: string) => void
  onOpenMarket?: () => void
  xSession?: XSession | null
  compact?: boolean
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, on: false })
  const stageRef = useRef<HTMLDivElement>(null)

  function onMove(e: ReactMouseEvent) {
    const el = stageRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    const x = ((e.clientX - r.left) / r.width) * 2 - 1
    const y = ((e.clientY - r.top) / r.height) * 2 - 1
    setTilt({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
      on: true,
    })
  }

  return (
    <div className={cn('space-y-3', !compact && 'border-t border-white/15 pt-3')}>
      {!compact && (
        <InfoCard title="Augment marketplace card" tone="purple">
          Special node: after X OAuth, your @handle becomes a marketplace MDX
          node with this Agentic pay card. Toggle the top{' '}
          <strong className="text-rose-300">X</strong> icon to wipe the MOA
          graph and open the market network.
          {onOpenMarket && (
            <div className="mt-2">
              <button
                type="button"
                onClick={onOpenMarket}
                className="w-full rounded-lg bg-rose-500 py-2 text-[11px] font-semibold text-white"
              >
                {xSession
                  ? `Open market as @${xSession.handle}`
                  : 'Open market · Sign in with X'}
              </button>
            </div>
          )}
        </InfoCard>
      )}
      <InfoCard title="Agent pay card" tone="blue">
        Drop any file (QR screenshot, camera roll, PDF scan, etc.) or paste the
        pay/transfer URL. Decoded handle feeds dry-run intent — never live send.
      </InfoCard>
      {!compact && (
        <InfoCard title="How auth works" tone="default">
          JTX gate (≥1) for agent tools. X OAuth for marketplace listing (top X
          toggle). No Privy.
          <StatusLine
            ok={gate?.ok ?? null}
            label={
              gate?.ok
                ? `Gate PASS · ${gate.uiAmount} JTX`
                : gate
                  ? 'Gate FAIL — open JTX Gate'
                  : 'Gate not checked yet'
            }
          />
          <JumpBtn onClick={() => onJump('4-shield')}>Open JTX Gate →</JumpBtn>
        </InfoCard>
      )}

      {/* Paste row */}
      <div className="flex gap-1.5">
        <input
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runPaste()
          }}
          placeholder="x.com/i/money/… or @handle"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#121216] px-3 py-2.5 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-sky-400/50"
        />
        <button
          type="button"
          onClick={runPaste}
          className="shrink-0 rounded-lg bg-sky-500 px-3 py-2.5 text-[12px] font-medium text-black"
        >
          Resolve
        </button>
      </div>

      {/* Glass QR stage */}
      <div
        ref={stageRef}
        className="relative h-[220px] overflow-hidden rounded-xl border border-white/15 bg-[#0a0d16] [perspective:900px]"
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0, on: false })}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-55"
          style={{ backgroundImage: "url('/jett-optx-bg-dark.jpg')" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-black/30" aria-hidden />

        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-black/50 px-2.5 py-1.5">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-white">
              Agentic pay card
            </div>
            <div className="truncate text-[10px] text-white/55">{payNote}</div>
          </div>
          <div className="flex shrink-0 gap-1">
            <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[9px] uppercase text-sky-100">
              X Money
            </span>
            {decode?.ok && (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] text-emerald-100">
                @{decode.handle}
              </span>
            )}
          </div>
        </div>

        <div
          className="absolute inset-0 top-9 flex items-center justify-center p-3 will-change-transform"
          style={{
            transformStyle: 'preserve-3d',
            transform: tilt.on
              ? `rotateX(${(-tilt.y * 8).toFixed(2)}deg) rotateY(${(tilt.x * 10).toFixed(2)}deg) scale(1.03)`
              : 'rotateX(0deg) rotateY(0deg) scale(1)',
            transition: tilt.on
              ? 'transform 90ms ease-out'
              : 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {previewSrc ? (
            <div
              className={cn(
                'relative h-[148px] w-[148px] shrink-0 rounded-[20px]',
                'border border-white/60',
                'bg-[linear-gradient(145deg,#f7fbff_0%,#e8f2ff_42%,#cfe4ff_100%)]',
                'shadow-[0_14px_40px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,1)]',
              )}
              style={{
                transform: tilt.on ? 'translateZ(10px)' : 'translateZ(0)',
              }}
            >
              <div className="absolute inset-[10px] z-[1] flex items-center justify-center overflow-hidden rounded-[12px] bg-black ring-1 ring-inset ring-[#1d9bf0]/45">
                <img
                  src={previewSrc}
                  alt="X Money QR"
                  className="block h-full w-full object-contain p-1.5"
                  draggable={false}
                />
              </div>
              <div
                className="pointer-events-none absolute inset-0 z-[2] rounded-[20px]"
                style={{
                  opacity: tilt.on ? 0.65 : 0.28,
                  background: `radial-gradient(90px circle at ${((tilt.x + 1) * 50).toFixed(1)}% ${((tilt.y + 1) * 50).toFixed(1)}%, rgba(255,255,255,0.75) 0%, transparent 55%)`,
                  mixBlendMode: 'soft-light',
                }}
              />
            </div>
          ) : (
            <div className="relative h-[150px] w-[150px]">
              <GlassObject
                src={DEFAULT_GLASS}
                ior={1.55}
                thickness={3}
                roughness={0.18}
                dispersion={1.15}
                clearcoat={0.6}
                depth={0.18}
                bevel={0.6}
                environmentIntensity={tilt.on ? 1.5 : 1.3}
                scale={tilt.on ? 2.25 : 2.1}
                floatIntensity={tilt.on ? 0.08 : 0.55}
                rotationIntensity={tilt.on ? 0.04 : 0.45}
                floatSpeed={1.2}
                fov={50}
                cameraDistance={3.8}
                orbit={false}
                highlight={tilt.on ? '#4db5ff' : '#1d9bf0'}
                background=""
                backgroundImage=""
                className="pointer-events-none absolute inset-0 block h-full w-full !min-h-0"
                style={{
                  height: '100%',
                  width: '100%',
                  minHeight: 0,
                  background: 'transparent',
                }}
              />
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 to-transparent pt-8">
          <div className="flex justify-center p-2">
            <label className="pointer-events-auto cursor-pointer rounded-lg border border-sky-400/45 bg-sky-500/25 px-3 py-1.5 text-[11px] font-medium text-sky-50 transition hover:bg-sky-500/40">
              {qrBusy ? 'Decoding…' : 'Load QR / any file'}
              <input
                type="file"
                accept="*/*"
                className="hidden"
                disabled={qrBusy}
                onChange={(e) => {
                  onQrFile(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Resolve meta */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-white/12 bg-[#121216] px-2.5 py-2">
          <div className="text-[9px] uppercase tracking-wide text-white/45">
            Handle
          </div>
          <div className="truncate text-[12px] text-white">
            {decode?.handle ? `@${decode.handle}` : '—'}
          </div>
        </div>
        <div className="rounded-lg border border-white/12 bg-[#121216] px-2.5 py-2">
          <div className="text-[9px] uppercase tracking-wide text-white/45">
            Kind
          </div>
          <div className="truncate text-[12px] text-white">
            {decode?.kind ?? '—'}
          </div>
        </div>
      </div>

      {decode?.ok && decode.transferUrl && (
        <div className="space-y-1.5">
          <CopyButton text={decode.transferUrl} label="Copy X Money link" primary />
          <a
            href={decode.transferUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-white/20 py-2 text-center text-[12px] text-white/85 hover:border-sky-400/40"
          >
            Open X Money ↗
          </a>
        </div>
      )}

      <InfoCard title="Agent harness · USDC" tone="purple">
        Keep the agent in your local harness. After resolve, copy dry-run intent
        into Hermes / Grok — harness attaches the USDC signature on Solana.
        LIVE settle stays blocked on this exhibit.
        <div className="mt-2 flex flex-wrap gap-1.5">
          <JumpBtn onClick={() => onJump('tool-dry-run')}>DryRun →</JumpBtn>
          <JumpBtn onClick={() => onJump('tool-plugin')}>Plugin →</JumpBtn>
        </div>
      </InfoCard>
    </div>
  )
}

/* ─── How-to cards (restored from exhibit UI) ───────────────────────────── */

function GuideSidebar({
  gate,
  decode,
  onJump,
  expandSignal,
}: {
  gate: JtxGateResult | null
  decode: TransferResolve | null
  onJump: (id: string) => void
  expandSignal?: string | null
}) {
  return (
    <LeftSidebarShell expandSignal={expandSignal}>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">
        <p className="text-[9px] uppercase tracking-[0.16em] text-white/55">
          Getting started
        </p>
        <h2 className="mt-0.5 text-base font-semibold tracking-tight text-white">
          How to use Wealth
        </h2>
        <p className="mt-2 mb-4 text-[12px] leading-relaxed text-white/80">
          Graph on the right is the Map of Augments. Click a node — this panel
          opens with profile / pay / tool details. Dry-run only; no live money.
        </p>
        <HowToCards gate={gate} decode={decode} onJump={onJump} compact={false} />
        <button
          type="button"
          onClick={() => onJump('8-wealth')}
          className="mt-4 w-full rounded-full border border-orange-500/40 bg-orange-500/15 py-2.5 text-[11px] text-orange-100"
        >
          Open Wealth-08 hub
        </button>
      </div>
    </LeftSidebarShell>
  )
}

function HowToCards({
  gate,
  decode,
  onJump,
  compact,
}: {
  gate: JtxGateResult | null
  decode: TransferResolve | null
  onJump: (id: string) => void
  compact?: boolean
}) {
  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5')}>
      <InfoCard title="How auth works" tone="default">
        <p className="leading-relaxed">
          No app login. The agent harness needs a{' '}
          <strong className="text-white">Solana wallet</strong> holding{' '}
          <strong className="text-emerald-300">≥ 1 $JTX</strong>. That gate is
          shared across OPTX side-cart projects.
        </p>
        <StatusLine
          ok={gate?.ok ?? null}
          label={
            gate?.ok
              ? `Gate PASS · ${gate.uiAmount} JTX`
              : gate
                ? 'Gate FAIL'
                : 'Gate not checked yet'
          }
        />
        <JumpBtn onClick={() => onJump('4-shield')}>Open JTX Gate →</JumpBtn>
      </InfoCard>

      <InfoCard title="1 · X Money pay card" tone="blue">
        <p className="leading-relaxed">
          Paste an X Money transfer/pay link (or @handle). We resolve the
          handle for dry-run payout intent — never live send.
        </p>
        <StatusLine
          ok={decode?.ok ?? null}
          label={
            decode?.ok
              ? `Resolved @${decode.handle}`
              : 'No link resolved yet'
          }
        />
        <JumpBtn onClick={() => onJump('2-send')}>Open X Money →</JumpBtn>
      </InfoCard>

      <InfoCard title="2 · JTX gate" tone="green">
        <p className="leading-relaxed">
          RPC balance check for mint{' '}
          <code className="text-[10px] text-emerald-200/90">{EXHIBIT.mintShort}</code>
          . Same-origin proxy avoids public RPC 403s.
        </p>
        <JumpBtn onClick={() => onJump('4-shield')}>Check gate →</JumpBtn>
      </InfoCard>

      <InfoCard title="3 · Dry-run intent" tone="default">
        <p className="leading-relaxed">
          After gate + X Money, open DryRun and copy JSON into Hermes / Grok.
          Policy: <strong className="text-amber-200">LIVE blocked</strong>.
        </p>
        <JumpBtn onClick={() => onJump('tool-dry-run')}>Open DryRun →</JumpBtn>
      </InfoCard>

      <InfoCard title="4 · Agent harness" tone="purple">
        <p className="leading-relaxed mb-2">
          Plug the public skill into your AI host, then mark it wired so the
          graph edge reaches this device.
        </p>
        <pre className="mb-2 overflow-x-auto rounded border border-white/10 bg-[#0e0e12] p-2.5 text-[11px] leading-snug text-violet-50">
{`npx skills add jettoptx/jettoptx-xwealth
npm run check-jtx
npm run dry-run`}
        </pre>
        <CopyButton
          text={`npx skills add jettoptx/jettoptx-xwealth\nnpm run check-jtx\nnpm run dry-run`}
          label="Copy harness commands"
        />
        <JumpBtn onClick={() => onJump('tool-plugin')}>Open Plugin →</JumpBtn>
      </InfoCard>

      <InfoCard title="Core · sister products" tone="amber">
        <p className="leading-relaxed">
          Orange <strong className="text-orange-300">Core-00</strong> links
          out: <strong className="text-sky-300">JTX.chat</strong> (DOJO) and{' '}
          <strong className="text-yellow-300">JTX.trade</strong> (trade dapp).
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <JumpBtn onClick={() => onJump('0-core')}>Core-00</JumpBtn>
          <JumpBtn onClick={() => onJump('link-jtx-chat')}>JTX.chat</JumpBtn>
          <JumpBtn onClick={() => onJump('link-jtx-trade')}>JTX.trade</JumpBtn>
        </div>
      </InfoCard>
    </div>
  )
}

/**
 * Clickable / selectable dry-run JSON box.
 * Drag the bottom grip down (or up) to resize. Double-click grip to expand tall.
 */
function ExpandableCode({
  value,
  className,
  minPx = 180,
  defaultPx = 280,
}: {
  value: string
  className?: string
  minPx?: number
  defaultPx?: number
}) {
  const [height, setHeight] = useState(defaultPx)
  const [dragging, setDragging] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const dragRef = useRef<{ startY: number; startH: number; pointerId: number } | null>(
    null,
  )

  const maxH = () =>
    typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.78) : 720

  const startDrag = (clientY: number, pointerId: number) => {
    dragRef.current = {
      startY: clientY,
      startH: height,
      pointerId,
    }
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const next = Math.min(
        maxH(),
        Math.max(minPx, d.startH + (e.clientY - d.startY)),
      )
      setHeight(next)
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (d && e.pointerId !== d.pointerId) return
      dragRef.current = null
      setDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragging, minPx])

  return (
    <div
      ref={boxRef}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border border-white/12 bg-[#0e0e12]',
        dragging && 'border-orange-500/45 shadow-[0_0_0_1px_rgba(255,98,0,0.25)]',
        className,
      )}
      style={{ height, flex: 'none' }}
    >
      <textarea
        ref={textRef}
        readOnly
        value={value}
        spellCheck={false}
        aria-label="Dry-run intent JSON"
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => {
          // First click focuses; second click / triple-click uses native selection
          if (document.activeElement !== e.currentTarget) {
            e.currentTarget.focus()
          }
        }}
        className={cn(
          'min-h-0 flex-1 w-full resize-none overflow-y-auto overflow-x-hidden',
          'bg-transparent p-3 font-mono text-[11px] leading-relaxed text-white/90',
          'outline-none selection:bg-orange-500/35 selection:text-white',
          'cursor-text whitespace-pre',
        )}
      />
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Drag down to expand JSON panel"
        title="Drag down to expand · double-click for tall view"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          try {
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          startDrag(e.clientY, e.pointerId)
        }}
        onDoubleClick={(e) => {
          e.preventDefault()
          setHeight((h) => (h >= maxH() * 0.9 ? defaultPx : maxH()))
        }}
        className={cn(
          'group flex h-5 shrink-0 cursor-row-resize touch-none items-center justify-center gap-2',
          'border-t border-white/12 bg-[#121216] hover:bg-orange-500/20 active:bg-orange-500/30',
          dragging && 'bg-orange-500/35',
        )}
      >
        <div className="h-1 w-12 rounded-full bg-white/35 group-hover:bg-orange-300/80" />
        <span className="pointer-events-none select-none text-[9px] uppercase tracking-wider text-white/40 group-hover:text-orange-200/90">
          drag
        </span>
        <div className="h-1 w-12 rounded-full bg-white/35 group-hover:bg-orange-300/80" />
      </div>
    </div>
  )
}

function InfoCard({
  title,
  children,
  tone = 'default',
}: {
  title: string
  children: ReactNode
  tone?: 'default' | 'blue' | 'green' | 'purple' | 'amber'
}) {
  const t = {
    default: 'border-white/15 bg-[#121216]',
    blue: 'border-sky-400/35 bg-[#0c1520]',
    green: 'border-emerald-400/35 bg-[#0c1814]',
    purple: 'border-violet-400/40 bg-[#14101c]',
    amber: 'border-amber-400/35 bg-[#18140c]',
  }[tone]
  return (
    <section className={cn('shrink-0 rounded-xl border px-3 py-2.5', t)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/90">
        {title}
      </h3>
      <div className="mt-1.5 text-[12px] leading-relaxed text-white/85">
        {children}
      </div>
    </section>
  )
}

function JumpBtn({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/75 transition hover:border-orange-500/40 hover:text-orange-100"
    >
      {children}
    </button>
  )
}

function StatusLine({
  ok,
  label,
}: {
  ok: boolean | null
  label: string
}) {
  return (
    <p
      className={cn(
        'mt-2 text-[11px] font-medium',
        ok === true
          ? 'text-emerald-300'
          : ok === false
            ? 'text-amber-200'
            : 'text-white/50',
      )}
    >
      {label}
    </p>
  )
}

/** Clipboard button with icon — shows check after successful copy */
function CopyButton({
  text,
  label,
  primary,
}: {
  text: string
  label: string
  primary?: boolean
}) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('ok')
      window.setTimeout(() => setState('idle'), 1600)
    } catch {
      // Fallback for older / blocked clipboard
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setState('ok')
        window.setTimeout(() => setState('idle'), 1600)
      } catch {
        setState('err')
        window.setTimeout(() => setState('idle'), 2000)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium transition',
        primary
          ? 'bg-violet-500 text-white hover:bg-violet-400'
          : 'border border-white/20 bg-[#16161c] text-white hover:border-white/35 hover:bg-[#1c1c24]',
        state === 'ok' && 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
        state === 'err' && 'border-rose-400/50 text-rose-200',
      )}
      aria-label={label}
    >
      {state === 'ok' ? (
        <CheckIcon className="h-4 w-4 shrink-0" />
      ) : (
        <ClipboardIcon className="h-4 w-4 shrink-0" />
      )}
      <span>
        {state === 'ok' ? 'Copied' : state === 'err' ? 'Copy failed' : label}
      </span>
    </button>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/* ─── Install one-liners (public plugin) ─────────────────────────────────── */

const GROK_INSTALL = 'grok plugin install jettoptx/jettoptx-xwealth --trust'

/** Unified clone + harness install (Grok plugin + Hermes skill) */
const HARNESS_INSTALL_PS = [
  'git clone --depth 1 https://github.com/jettoptx/jettoptx-xwealth.git "$env:TEMP\\jtx-xwealth"',
  'cd "$env:TEMP\\jtx-xwealth"',
  'npm run install:harness',
].join('; ')

const HARNESS_INSTALL_SH =
  'git clone --depth 1 https://github.com/jettoptx/jettoptx-xwealth.git /tmp/jtx-xwealth && cd /tmp/jtx-xwealth && npm run install:harness'

const HERMES_INSTALL_PS = [
  '$d="$env:LOCALAPPDATA\\hermes\\custom-skills\\xwealth"',
  'New-Item -ItemType Directory -Force -Path $d | Out-Null',
  'git clone --depth 1 https://github.com/jettoptx/jettoptx-xwealth.git "$env:TEMP\\jtx-xwealth"',
  'Copy-Item -Recurse -Force "$env:TEMP\\jtx-xwealth\\skills\\xwealth\\*" $d',
  'Write-Host "Installed Hermes skill → $d"',
].join('; ')

const SKILLS_ADD = 'npx --yes skills add jettoptx/jettoptx-xwealth'

function defaultPlugFor(harness: CustomWealthNode['harness']): string {
  if (harness === 'grok') return GROK_INSTALL
  if (harness === 'hermes') return HERMES_INSTALL_PS
  if (harness === 'claude' || harness === 'cursor') return SKILLS_ADD
  return SKILLS_ADD
}

/* ─── X OAuth via Jett Optics Privy (real modal) ───────────────────────── */

function XAuthModal({
  onClose,
  onSignIn,
}: {
  onClose: () => void
  onSignIn: (
    handle: string,
    displayName?: string,
    method?: XSession['method'],
  ) => void
  initialHandle?: string
}) {
  if (!privyEnabled) {
    return (
      <div
        className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="w-full max-w-md rounded-2xl border border-amber-500/35 bg-[#0a0708]/98 p-5 font-mono shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal
        >
          <h2 className="text-sm font-semibold text-white">Privy not configured</h2>
          <p className="mt-2 text-[12px] text-white/65">
            Set <code className="text-amber-200">VITE_PRIVY_APP_ID</code> (Jett
            Optics app) in <code className="text-white/80">.env.local</code>, then
            restart Vite.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-white/12 py-2 text-[11px] text-white/50"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return <XAuthModalPrivy onClose={onClose} onSignIn={onSignIn} />
}

function XAuthModalPrivy({
  onClose,
  onSignIn,
}: {
  onClose: () => void
  onSignIn: (
    handle: string,
    displayName?: string,
    method?: XSession['method'],
  ) => void
}) {
  const auth = useXWealthAuth()
  const [error, setError] = useState<string | null>(null)
  const finished = useRef(false)

  // When Privy session already has X linked, finish marketplace bind
  useEffect(() => {
    if (!auth.ready || !auth.authenticated || finished.current) return
    if (auth.twitterUsername) {
      finished.current = true
      onSignIn(
        auth.twitterUsername,
        auth.twitterDisplayName ?? auth.twitterUsername,
        'privy-x',
      )
      return
    }
    // Authenticated without X — ask to link Twitter via Privy modal
    setError(
      'Signed in, but no X handle is linked yet. Continue with X to attach @handle.',
    )
  }, [
    auth.ready,
    auth.authenticated,
    auth.twitterUsername,
    auth.twitterDisplayName,
    onSignIn,
  ])

  function openPrivyX() {
    setError(null)
    try {
      auth.login({ xOnly: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/35 bg-[#0a0708]/98 p-5 font-mono shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="x-auth-title"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <img src="/x-logo.svg" alt="" className="h-4 w-4" draggable={false} />
          </span>
          <div>
            <h2 id="x-auth-title" className="text-sm font-semibold text-white">
              Sign in with X
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-rose-300/80">
              Jett Optics · Privy OAuth
            </p>
          </div>
        </div>
        <p className="mb-4 text-[12px] leading-relaxed text-white/70">
          Opens the real <strong className="text-white">Jett Optics Privy</strong>{' '}
          modal for X OAuth. Your <strong className="text-white">@handle</strong>{' '}
          becomes a node on the marketplace graph with an{' '}
          <strong className="text-rose-200">Agentic pay card</strong>.
        </p>
        <InfoCard title="Auth path" tone="blue">
          Privy (Jett Optics app) → X OAuth → profile @handle → marketplace
          session. No local username stub.
        </InfoCard>
        {error && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            {error}
          </p>
        )}
        <div className="mt-4 space-y-3">
          <button
            type="button"
            disabled={!auth.ready}
            onClick={openPrivyX}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[12px] font-semibold text-black disabled:opacity-40"
          >
            <img src="/x-logo.svg" alt="" className="h-3.5 w-3.5" draggable={false} />
            {!auth.ready
              ? 'Loading Privy…'
              : auth.authenticated && !auth.twitterUsername
                ? 'Link X with Privy'
                : 'Continue with X'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-white/12 py-2 text-[11px] text-white/50 hover:text-white/80"
          >
            Cancel
          </button>
          <p className="text-center text-[9px] text-white/35">
            Powered by Privy · OPTX identity
          </p>
        </div>
      </div>
    </div>
  )
}

function MarketSkillsPanel({
  xSession,
  skills,
  onOpenXAuth,
  onAdd,
  onRemove,
}: {
  xSession: XSession | null
  skills: MarketSkill[]
  onOpenXAuth: () => void
  onAdd: (name: string, blurb: string) => void
  onRemove: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [blurb, setBlurb] = useState('')

  if (!xSession) {
    return (
      <div className="space-y-2 border-t border-white/10 pt-3">
        <InfoCard title="List agent skills" tone="amber">
          Sign in with X first — skills attach to your @handle on the
          marketplace graph.
        </InfoCard>
        <button
          type="button"
          onClick={onOpenXAuth}
          className="w-full rounded-lg bg-rose-500 py-2.5 text-[12px] font-medium text-white"
        >
          Sign in with X
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-white/10 pt-3">
      <InfoCard title="Agent software skills" tone="purple">
        List skills under @{xSession.handle}. They appear as child nodes so
        other users can find your augment marketplace catalog.
      </InfoCard>
      <div className="space-y-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Skill name (e.g. check-jtx)"
          className="w-full rounded-lg border border-white/15 bg-[#121216] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-orange-400/50"
        />
        <input
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          placeholder="Short description"
          className="w-full rounded-lg border border-white/15 bg-[#121216] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-orange-400/50"
        />
        <button
          type="button"
          onClick={() => {
            if (!name.trim()) return
            onAdd(name, blurb)
            setName('')
            setBlurb('')
          }}
          className="w-full rounded-lg bg-orange-500 py-2.5 text-[12px] font-medium text-black"
        >
          List skill on market
        </button>
      </div>
      <ul className="space-y-1.5 pt-1">
        {skills.length === 0 && (
          <li className="text-[11px] text-white/40">No skills listed yet.</li>
        )}
        {skills.map((s) => (
          <li
            key={s.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium text-white">
                {s.name}
              </div>
              {s.blurb && (
                <div className="mt-0.5 text-[10px] text-white/50">{s.blurb}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(s.id)}
              className="shrink-0 text-[10px] text-white/35 hover:text-rose-300"
            >
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─── Add node modal (draggable + resizable · thin scrollbar) ───────────── */

const ADD_MODAL_MIN_W = 300
const ADD_MODAL_MIN_H = 280
const ADD_MODAL_DEFAULT_W = 420
const ADD_MODAL_DEFAULT_H = 560

function AddNodeModal({
  anchors,
  deviceId,
  onClose,
  onCreate,
}: {
  anchors: { id: string; label: string }[]
  deviceId: string
  onClose: () => void
  onCreate: (input: {
    name: string
    description: string
    tensor: Exclude<AgtKey, 'ROOT'>
    connectTo: string
    harness: CustomWealthNode['harness']
    plug?: string
  }) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tensor, setTensor] = useState<Exclude<AgtKey, 'ROOT'>>('ENV')
  const [connectTo, setConnectTo] = useState(deviceId)
  const [harness, setHarness] =
    useState<CustomWealthNode['harness']>('hermes')
  const [plug, setPlug] = useState(defaultPlugFor('hermes'))

  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 40, y: 60 }
    return {
      x: Math.max(16, (window.innerWidth - ADD_MODAL_DEFAULT_W) / 2),
      y: Math.max(48, (window.innerHeight - ADD_MODAL_DEFAULT_H) / 2 - 20),
    }
  })
  const [size, setSize] = useState({
    w: ADD_MODAL_DEFAULT_W,
    h: ADD_MODAL_DEFAULT_H,
  })
  const dragRef = useRef<{
    kind: 'move' | 'resize'
    mx: number
    my: number
    ox: number
    oy: number
    ow: number
    oh: number
    pid: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setPlug(defaultPlugFor(harness))
    if (harness === 'hermes' && !name.trim()) setName('Hermes')
    if (harness === 'grok' && (!name.trim() || name === 'Hermes')) setName('Grok')
  }, [harness])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pid) return
      if (d.kind === 'move') {
        setPos({
          x: d.ox + (e.clientX - d.mx),
          y: d.oy + (e.clientY - d.my),
        })
      } else {
        const maxW = Math.min(window.innerWidth - 24, 720)
        const maxH = Math.min(window.innerHeight - 24, 900)
        setSize({
          w: Math.min(
            maxW,
            Math.max(ADD_MODAL_MIN_W, d.ow + (e.clientX - d.mx)),
          ),
          h: Math.min(
            maxH,
            Math.max(ADD_MODAL_MIN_H, d.oh + (e.clientY - d.my)),
          ),
        })
      }
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (d && e.pointerId !== d.pid) return
      dragRef.current = null
      setDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragging])

  function startMove(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).closest('button, input, select, a, textarea'))
      return
    e.preventDefault()
    dragRef.current = {
      kind: 'move',
      mx: e.clientX,
      my: e.clientY,
      ox: pos.x,
      oy: pos.y,
      ow: size.w,
      oh: size.h,
      pid: e.pointerId,
    }
    setDragging(true)
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }

  function startResize(e: ReactPointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      kind: 'resize',
      mx: e.clientX,
      my: e.clientY,
      ox: pos.x,
      oy: pos.y,
      ow: size.w,
      oh: size.h,
      pid: e.pointerId,
    }
    setDragging(true)
    document.body.style.cursor = 'nwse-resize'
    document.body.style.userSelect = 'none'
  }

  /** Double-click title → maximize / restore */
  function toggleMaximize() {
    const maxW = Math.min(window.innerWidth - 32, 720)
    const maxH = Math.min(window.innerHeight - 48, 900)
    const isMax =
      size.w >= maxW - 8 &&
      size.h >= maxH - 8 &&
      pos.x <= 24 &&
      pos.y <= 64
    if (isMax) {
      setSize({ w: ADD_MODAL_DEFAULT_W, h: ADD_MODAL_DEFAULT_H })
      setPos({
        x: Math.max(16, (window.innerWidth - ADD_MODAL_DEFAULT_W) / 2),
        y: Math.max(48, (window.innerHeight - ADD_MODAL_DEFAULT_H) / 2 - 20),
      })
    } else {
      setSize({ w: maxW, h: maxH })
      setPos({ x: 16, y: 48 })
    }
  }

  const [panelMenu, setPanelMenu] = useState<{ x: number; y: number } | null>(
    null,
  )

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({
      name,
      description:
        description ||
        `Agent harness node · ${harness} · connected to ${connectTo}`,
      tensor,
      connectTo,
      harness,
      plug,
    })
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <div
        className="pointer-events-none absolute inset-0 bg-black/20"
        aria-hidden
      />
      <form
        onSubmit={submit}
        className={cn(
          'pointer-events-auto fixed flex flex-col overflow-hidden rounded-2xl border border-orange-500/30 bg-[#0a0706]/98 font-mono shadow-[0_20px_60px_rgba(0,0,0,0.65)]',
          dragging && 'border-orange-400/50 shadow-[0_0_0_1px_rgba(255,98,0,0.25)]',
        )}
        style={{
          left: pos.x,
          top: pos.y,
          width: size.w,
          height: size.h,
        }}
        onClick={(e) => {
          e.stopPropagation()
          setPanelMenu(null)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setPanelMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        {panelMenu && (
          <PanelContextMenu
            x={panelMenu.x}
            y={panelMenu.y}
            onClose={() => setPanelMenu(null)}
            items={[
              {
                label: 'Maximize / restore',
                onClick: () => {
                  toggleMaximize()
                  setPanelMenu(null)
                },
              },
              {
                label: 'Reset size',
                onClick: () => {
                  setSize({ w: ADD_MODAL_DEFAULT_W, h: ADD_MODAL_DEFAULT_H })
                  setPanelMenu(null)
                },
              },
              {
                label: 'Close panel',
                onClick: () => {
                  setPanelMenu(null)
                  onClose()
                },
              },
            ]}
          />
        )}
        {/* Drag handle header */}
        <div
          className="flex shrink-0 cursor-grab items-center justify-between gap-2 border-b border-white/10 bg-[#100c0a] px-3 py-2.5 active:cursor-grabbing sm:px-4"
          onPointerDown={startMove}
          onDoubleClick={(e) => {
            e.preventDefault()
            toggleMaximize()
          }}
        >
          <div className="min-w-0 select-none">
            <h3 className="text-sm tracking-wide text-white/90">
              Add node · device bus
            </h3>
            <p className="text-[9px] text-white/35">
              Drag title · click cards to expand · corner resize · right-click
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-white/10 px-2 py-0.5 text-white/40 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body — thin scrollbar */}
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4">
          <p className="mb-3 text-[10px] leading-relaxed text-white/40">
            Graph node on{' '}
            <strong className="text-orange-400/90">this device</strong> + edge
            to harness. Graph stays interactive behind.
          </p>

          <div className="mb-4 space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
            <p className="text-[9px] uppercase tracking-[0.16em] text-orange-400/90">
              Easy install · click card to resize · right-click actions
            </p>
            <InstallLine
              label="Both (Grok + Hermes) · PowerShell"
              cmd={HARNESS_INSTALL_PS}
              hint="clone → npm run install:harness"
              onUseAsPlug={(c) => {
                setPlug(c)
                setHarness('hermes')
              }}
            />
            <InstallLine
              label="Both (Grok + Hermes) · bash"
              cmd={HARNESS_INSTALL_SH}
              hint="macOS / Linux / WSL"
              onUseAsPlug={(c) => {
                setPlug(c)
                setHarness('hermes')
              }}
            />
            <InstallLine
              label="Grok Build plugin only"
              cmd={GROK_INSTALL}
              hint="one-liner · after: r in /plugins"
              onUseAsPlug={(c) => {
                setPlug(c)
                setHarness('grok')
                setName((n) => (n.trim() && n !== 'Hermes' ? n : 'Grok'))
              }}
            />
            <InstallLine
              label="Hermes skill only (PowerShell)"
              cmd={HERMES_INSTALL_PS}
              hint="Windows · LOCALAPPDATA\\hermes\\custom-skills"
              onUseAsPlug={(c) => {
                setPlug(c)
                setHarness('hermes')
                setName((n) => (n.trim() && n !== 'Grok' ? n : 'Hermes'))
              }}
            />
            <InstallLine
              label="Generic skills CLI"
              cmd={SKILLS_ADD}
              hint="Claude / Cursor / npx skills"
              onUseAsPlug={(c) => {
                setPlug(c)
                setHarness('cursor')
              }}
            />
          </div>

          <label className="mb-3 block text-[9px] uppercase tracking-wider text-white/35">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hermes-PC"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[12px] text-white outline-none focus:border-orange-500/40"
              autoFocus
            />
          </label>

          <label className="mb-3 block text-[9px] uppercase tracking-wider text-white/35">
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="optional"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[12px] text-white outline-none focus:border-orange-500/40"
            />
          </label>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="block text-[9px] uppercase tracking-wider text-white/35">
              AGT
              <select
                value={tensor}
                onChange={(e) =>
                  setTensor(e.target.value as Exclude<AgtKey, 'ROOT'>)
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-[12px] text-white"
              >
                <option value="COG">COG</option>
                <option value="EMO">EMO</option>
                <option value="ENV">ENV</option>
              </select>
            </label>
            <label className="block text-[9px] uppercase tracking-wider text-white/35">
              Harness
              <select
                value={harness}
                onChange={(e) =>
                  setHarness(e.target.value as CustomWealthNode['harness'])
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-[12px] text-white"
              >
                <option value="hermes">Hermes</option>
                <option value="grok">Grok</option>
                <option value="claude">Claude</option>
                <option value="cursor">Cursor</option>
                <option value="openclaw">OpenClaw</option>
                <option value="browser">Browser</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <label className="mb-3 block text-[9px] uppercase tracking-wider text-white/35">
            Connect to (edge)
            <select
              value={connectTo}
              onChange={(e) => setConnectTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-[12px] text-white"
            >
              <option value={deviceId}>Device (this host)</option>
              <option value="8-wealth">Wealth-08</option>
              <option value="0-core">Core-00</option>
              {anchors
                .filter(
                  (a) => !['0-core', '8-wealth', deviceId].includes(a.id),
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
            </select>
          </label>

          <label className="mb-2 block text-[9px] uppercase tracking-wider text-white/35">
            Plug command (stored on node)
            <div className="mt-1 flex gap-1.5">
              <input
                value={plug}
                onChange={(e) => setPlug(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[10px] text-emerald-200/90 outline-none focus:border-orange-500/40"
              />
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(plug)}
                className="shrink-0 rounded-lg border border-white/15 px-2.5 text-[10px] text-white/60 hover:text-white"
              >
                Copy
              </button>
            </div>
          </label>
        </div>

        {/* Footer actions — always visible */}
        <div className="flex shrink-0 gap-2 border-t border-white/10 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 py-2 text-[11px] text-white/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-orange-500 py-2 text-[11px] font-medium text-black"
          >
            Add to MOA
          </button>
        </div>

        {/* Resize grip — bottom-right */}
        <div
          role="separator"
          aria-label="Resize panel"
          title="Drag to resize"
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 z-10 flex h-5 w-5 cursor-nwse-resize items-end justify-end p-0.5"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className="text-orange-400/70"
            aria-hidden
          >
            <path
              d="M10 2 L10 10 L2 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M10 6 L6 10 M10 9 L9 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </form>
    </div>
  )
}

function InstallLine({
  label,
  cmd,
  hint,
  onUseAsPlug,
}: {
  label: string
  cmd: string
  hint: string
  /** Wire command into Plug field on the form */
  onUseAsPlug?: (cmd: string) => void
}) {
  const [ok, setOk] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [height, setHeight] = useState(72)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [resizing, setResizing] = useState(false)
  const resizeRef = useRef<{
    my: number
    h0: number
    pid: number
  } | null>(null)

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: PointerEvent) => {
      const d = resizeRef.current
      if (!d || e.pointerId !== d.pid) return
      const next = Math.min(320, Math.max(56, d.h0 + (e.clientY - d.my)))
      setHeight(next)
      setExpanded(next > 100)
    }
    const onUp = (e: PointerEvent) => {
      const d = resizeRef.current
      if (d && e.pointerId !== d.pid) return
      resizeRef.current = null
      setResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [resizing])

  function copyCmd() {
    void navigator.clipboard.writeText(cmd).then(() => {
      setOk(true)
      window.setTimeout(() => setOk(false), 1400)
    })
  }

  function toggleExpand() {
    if (expanded) {
      setExpanded(false)
      setHeight(72)
    } else {
      setExpanded(true)
      setHeight(168)
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-[#0c0c10] transition',
        expanded
          ? 'border-orange-500/35 shadow-[0_0_0_1px_rgba(255,98,0,0.12)]'
          : 'border-white/8 hover:border-white/18',
      )}
      style={{ height }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      {menu && (
        <PanelContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              label: ok ? 'Copied!' : 'Copy command',
              onClick: () => {
                copyCmd()
                setMenu(null)
              },
            },
            {
              label: expanded ? 'Collapse card' : 'Expand card',
              onClick: () => {
                toggleExpand()
                setMenu(null)
              },
            },
            ...(onUseAsPlug
              ? [
                  {
                    label: 'Use as plug command',
                    onClick: () => {
                      onUseAsPlug(cmd)
                      setMenu(null)
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
      <div className="flex h-full flex-col px-2.5 pt-2 pb-1">
        <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleExpand}
            className="min-w-0 flex-1 truncate text-left text-[10px] font-semibold text-white/80 hover:text-orange-200"
            title="Click to expand / collapse"
          >
            {label}
            <span className="ml-1.5 text-[8px] font-normal text-white/30">
              {expanded ? '▼' : '▶'}
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              copyCmd()
            }}
            className="shrink-0 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-200 hover:bg-emerald-500/20"
          >
            {ok ? 'Copied' : 'Copy'}
          </button>
        </div>
        <code
          className={cn(
            'thin-scroll min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-all text-[9px] leading-snug text-emerald-300/85',
          )}
        >
          {cmd}
        </code>
        <p className="mt-0.5 shrink-0 truncate text-[8px] text-white/30">
          {hint}
        </p>
      </div>
      {/* Click-drag bottom edge to size card */}
      <div
        role="separator"
        aria-label="Resize install card"
        title="Drag to resize height"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          resizeRef.current = {
            my: e.clientY,
            h0: height,
            pid: e.pointerId,
          }
          setResizing(true)
          document.body.style.cursor = 'row-resize'
          document.body.style.userSelect = 'none'
        }}
        className="absolute inset-x-0 bottom-0 z-10 flex h-2.5 cursor-row-resize items-center justify-center"
      >
        <span className="h-0.5 w-8 rounded-full bg-white/20" aria-hidden />
      </div>
    </div>
  )
}

function PanelContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: { label: string; onClick: () => void; danger?: boolean }[]
  onClose: () => void
}) {
  useEffect(() => {
    const close = () => onClose()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const left = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 180 : x)
  const top = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 160 : y)

  return (
    <div
      role="menu"
      className="fixed z-[80] min-w-[160px] overflow-hidden rounded-lg border border-orange-500/30 bg-[#100c0a]/98 py-1 font-mono shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={item.onClick}
          className={cn(
            'flex w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-orange-500/15',
            item.danger ? 'text-rose-300 hover:bg-rose-500/10' : 'text-white/80',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function GraphContextMenu({
  x,
  y,
  kind,
  node,
  canDelete,
  onClose,
  onFocus,
  onSelect,
  onAddNode,
  onCopyId,
  onCopyLabel,
  onDelete,
  onResetView,
}: {
  x: number
  y: number
  kind: 'node' | 'canvas'
  node: { id: string; label: string } | null
  canDelete: boolean
  onClose: () => void
  onFocus: () => void
  onSelect: () => void
  onAddNode: () => void
  onCopyId: () => void
  onCopyLabel: () => void
  onDelete: () => void
  onResetView: () => void
}) {
  const items: { label: string; onClick: () => void; danger?: boolean }[] =
    kind === 'node' && node
      ? [
          { label: `Select · ${node.label}`, onClick: onSelect },
          { label: 'Focus node', onClick: onFocus },
          { label: 'Copy label', onClick: onCopyLabel },
          { label: 'Copy node id', onClick: onCopyId },
          { label: 'Add node…', onClick: onAddNode },
          ...(canDelete
            ? [{ label: 'Delete node', onClick: onDelete, danger: true }]
            : []),
        ]
      : [
          { label: 'Add node…', onClick: onAddNode },
          { label: 'Reset view 1:1', onClick: onResetView },
        ]

  return (
    <PanelContextMenu x={x} y={y} items={items} onClose={onClose} />
  )
}
