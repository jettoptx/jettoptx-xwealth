/**
 * Wealth MOA force-graph (docs MOA visual language, no Next.js deps).
 * Nodes = live exhibit surfaces; click opens harness panel.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import {
  AGT,
  WEALTH_EDGES,
  WEALTH_NODES,
  type WealthNode,
  type WealthNodeId,
  getConnections,
} from '@/lib/wealth-moa'

type SimNode = WealthNode & {
  x: number
  y: number
  vx: number
  vy: number
  pulse: number
}

type Particle = { edge: number; t: number; speed: number; color: string; size: number }

function initNodes(w: number, h: number): SimNode[] {
  const cx = w / 2
  const cy = h / 2
  return WEALTH_NODES.map((n, i) => {
    const angle = (i / WEALTH_NODES.length) * Math.PI * 2 - Math.PI / 2
    // Hub near center; others on rings
    const isHub = n.id === 'wealth-08'
    const r = isHub ? 0 : 90 + (i % 4) * 38 + (i % 3) * 12
    return {
      ...n,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r * 0.88,
      vx: 0,
      vy: 0,
      pulse: Math.random() * Math.PI * 2,
    }
  })
}

function initParticles(): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < 18; i++) {
    const ei = Math.floor(Math.random() * WEALTH_EDGES.length)
    const n = WEALTH_NODES[Math.floor(Math.random() * WEALTH_NODES.length)]
    out.push({
      edge: ei,
      t: Math.random(),
      speed: 0.0012 + Math.random() * 0.002,
      color: AGT[n.agt].color,
      size: 0.9 + Math.random() * 1.1,
    })
  }
  return out
}

export function WealthMoaCanvas({
  selectedId,
  onSelect,
  className,
}: {
  selectedId: WealthNodeId | null
  onSelect: (id: WealthNodeId | null) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const particlesRef = useRef<Particle[]>([])
  const initialized = useRef(false)
  const animRef = useRef(0)
  const timeRef = useRef(0)
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(
    null,
  )
  const zoomRef = useRef(1)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hovered, setHovered] = useState<WealthNodeId | null>(null)
  const [panning, setPanning] = useState(false)
  const mouseRef = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const resize = () => {
      const el = containerRef.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      setDims({ w, h })
      if (!initialized.current && w > 0 && h > 0) {
        nodesRef.current = initNodes(w, h)
        particlesRef.current = initParticles()
        initialized.current = true
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', resize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const z = zoomRef.current
    const p = panRef.current
    return {
      x: (sx - dims.w / 2) / z - p.x + dims.w / 2,
      y: (sy - dims.h / 2) / z - p.y + dims.h / 2,
    }
  }, [dims])

  const hitTest = useCallback(
    (sx: number, sy: number): SimNode | null => {
      const { x, y } = screenToWorld(sx, sy)
      const nodes = nodesRef.current
      let best: SimNode | null = null
      let bestD = Infinity
      for (const n of nodes) {
        const d = Math.hypot(n.x - x, n.y - y)
        if (d < n.radius + 8 && d < bestD) {
          best = n
          bestD = d
        }
      }
      return best
    },
    [screenToWorld],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dims.w < 1) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(dims.w * dpr)
    canvas.height = Math.floor(dims.h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const simulate = () => {
      const nodes = nodesRef.current
      if (!nodes.length) return
      const cx = dims.w / 2
      const cy = dims.h / 2

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.max(Math.hypot(dx, dy), 1)
          const force = 1400 / (dist * dist)
          nodes[i].vx -= (dx / dist) * force
          nodes[i].vy -= (dy / dist) * force
          nodes[j].vx += (dx / dist) * force
          nodes[j].vy += (dy / dist) * force
        }
      }

      const map = new Map(nodes.map((n) => [n.id, n]))
      for (const e of WEALTH_EDGES) {
        const s = map.get(e.source)
        const t = map.get(e.target)
        if (!s || !t) continue
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.max(Math.hypot(dx, dy), 1)
        const ideal = 130
        const f = (dist - ideal) * 0.012
        s.vx += (dx / dist) * f
        s.vy += (dy / dist) * f
        t.vx -= (dx / dist) * f
        t.vy -= (dy / dist) * f
      }

      for (const n of nodes) {
        // pull hub to center
        if (n.id === 'wealth-08') {
          n.vx += (cx - n.x) * 0.04
          n.vy += (cy - n.y) * 0.04
        } else {
          n.vx += (cx - n.x) * 0.002
          n.vy += (cy - n.y) * 0.002
        }
        if (dragRef.current?.id === n.id) {
          n.vx = 0
          n.vy = 0
          continue
        }
        n.vx *= 0.82
        n.vy *= 0.82
        n.x += n.vx
        n.y += n.vy
        n.x = Math.max(40, Math.min(dims.w - 40, n.x))
        n.y = Math.max(40, Math.min(dims.h - 40, n.y))
        n.pulse += 0.03
      }
    }

    const draw = () => {
      const nodes = nodesRef.current
      const particles = particlesRef.current
      if (!nodes.length) return
      timeRef.current += 1
      simulate()

      ctx.clearRect(0, 0, dims.w, dims.h)
      ctx.save()
      ctx.translate(dims.w / 2, dims.h / 2)
      ctx.scale(zoomRef.current, zoomRef.current)
      ctx.translate(
        -dims.w / 2 + panRef.current.x,
        -dims.h / 2 + panRef.current.y,
      )

      const map = new Map(nodes.map((n) => [n.id, n]))
      const connected = selectedId
        ? new Set(getConnections(selectedId))
        : hovered
          ? new Set(getConnections(hovered))
          : null
      if (selectedId) connected?.add(selectedId)
      if (hovered) connected?.add(hovered)

      // edges
      for (const e of WEALTH_EDGES) {
        const s = map.get(e.source)
        const t = map.get(e.target)
        if (!s || !t) continue
        const hot =
          !connected ||
          (connected.has(e.source) && connected.has(e.target))
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)
        ctx.strokeStyle = hot
          ? 'rgba(240,237,232,0.22)'
          : 'rgba(240,237,232,0.05)'
        ctx.lineWidth = hot ? 1.25 : 0.6
        ctx.stroke()
      }

      // particles
      for (const p of particles) {
        const e = WEALTH_EDGES[p.edge]
        if (!e) continue
        const s = map.get(e.source)
        const t = map.get(e.target)
        if (!s || !t) continue
        p.t = (p.t + p.speed) % 1
        const x = s.x + (t.x - s.x) * p.t
        const y = s.y + (t.y - s.y) * p.t
        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = 0.55
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // nodes
      for (const n of nodes) {
        const agt = AGT[n.agt]
        const isSel = n.id === selectedId
        const isHov = n.id === hovered
        const dimmed = connected && !connected.has(n.id)
        const pulse = 1 + Math.sin(n.pulse) * 0.06
        const r = n.radius * pulse

        if (isSel || isHov) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 10, 0, Math.PI * 2)
          ctx.fillStyle = agt.glow
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        const g = ctx.createRadialGradient(
          n.x - r * 0.3,
          n.y - r * 0.3,
          r * 0.1,
          n.x,
          n.y,
          r,
        )
        g.addColorStop(0, dimmed ? 'rgba(40,40,48,0.9)' : agt.color)
        g.addColorStop(1, dimmed ? 'rgba(12,12,16,0.95)' : '#0a0a0c')
        ctx.fillStyle = g
        ctx.globalAlpha = dimmed ? 0.35 : 1
        ctx.fill()
        ctx.strokeStyle = isSel
          ? '#F0EDE8'
          : dimmed
            ? 'rgba(240,237,232,0.15)'
            : agt.color
        ctx.lineWidth = isSel ? 2 : 1.25
        ctx.stroke()
        ctx.globalAlpha = 1

        // digit / label
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        if (n.digit) {
          ctx.font = `600 ${Math.max(10, r * 0.45)}px Syne, system-ui, sans-serif`
          ctx.fillStyle = dimmed ? 'rgba(240,237,232,0.35)' : '#F0EDE8'
          ctx.fillText(n.digit, n.x, n.y - 2)
        }
        ctx.font = `500 10px "Space Mono", ui-monospace, monospace`
        ctx.fillStyle = dimmed ? 'rgba(240,237,232,0.3)' : 'rgba(240,237,232,0.85)'
        ctx.fillText(n.label, n.x, n.y + r + 12)
      }

      ctx.restore()
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [dims, selectedId, hovered])

  function onPointerDown(e: ReactMouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const hit = hitTest(sx, sy)
    if (hit) {
      dragRef.current = { id: hit.id, ox: 0, oy: 0 }
      onSelect(hit.id)
      return
    }
    panStart.current = {
      mx: e.clientX,
      my: e.clientY,
      px: panRef.current.x,
      py: panRef.current.y,
    }
    setPanning(true)
  }

  function onPointerMove(e: ReactMouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    mouseRef.current = { x: sx, y: sy }

    if (dragRef.current) {
      const w = screenToWorld(sx, sy)
      const n = nodesRef.current.find((x) => x.id === dragRef.current!.id)
      if (n) {
        n.x = w.x
        n.y = w.y
        n.vx = 0
        n.vy = 0
      }
      return
    }

    if (panStart.current) {
      const z = zoomRef.current
      panRef.current = {
        x: panStart.current.px + (e.clientX - panStart.current.mx) / z,
        y: panStart.current.py + (e.clientY - panStart.current.my) / z,
      }
      return
    }

    const hit = hitTest(sx, sy)
    setHovered(hit?.id ?? null)
  }

  function onPointerUp() {
    dragRef.current = null
    panStart.current = null
    setPanning(false)
  }

  function onWheel(e: ReactWheelEvent) {
    e.preventDefault()
    const next = Math.min(2.2, Math.max(0.55, zoomRef.current * (e.deltaY > 0 ? 0.92 : 1.08)))
    zoomRef.current = next
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: panning ? 'grabbing' : hovered ? 'pointer' : 'grab',
          touchAction: 'none',
        }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={() => {
          panRef.current = { x: 0, y: 0 }
          zoomRef.current = 1
          onSelect(null)
        }}
      />
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 font-sub text-[10px] tracking-[0.14em] text-white/35 uppercase">
        drag nodes · scroll zoom · double-click reset
      </div>
    </div>
  )
}
