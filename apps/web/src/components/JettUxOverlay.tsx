/**
 * JettUxOverlay — pure presentational AGT simplex HUD.
 * Matches brand card: gold glass shell, ternary field, COG/EMO/ENV nodes.
 */
import { useMemo } from 'react'
import {
  AGT_CENTER,
  AGT_COLORS,
  AGT_VERTS,
  type AgtGazeState,
  type AgtId,
  type AgtWeights,
} from '@/lib/agt-gaze'
import { cn } from '@/lib/utils'

type Props = {
  state: AgtGazeState
  live?: boolean
  className?: string
}

type FieldDot = {
  x: number
  y: number
  w: AgtWeights
  region: AgtId
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function baryWeights(x: number, y: number): AgtWeights {
  const eps = 1e-4
  const dC = 1 / (dist(x, y, AGT_VERTS.COG.x, AGT_VERTS.COG.y) + eps)
  const dE = 1 / (dist(x, y, AGT_VERTS.EMO.x, AGT_VERTS.EMO.y) + eps)
  const dV = 1 / (dist(x, y, AGT_VERTS.ENV.x, AGT_VERTS.ENV.y) + eps)
  const s = dC + dE + dV
  return { COG: dC / s, EMO: dE / s, ENV: dV / s }
}

function buildFieldDots(): FieldDot[] {
  const dots: FieldDot[] = []
  const spacingX = 9.2
  const spacingY = 8.0
  const oddOffset = 4.6
  const cx = 100
  const cy = 100
  const maxR = 76

  for (let row = -8; row <= 8; row++) {
    for (let col = -8; col <= 8; col++) {
      const x = cx + col * spacingX + (row % 2 !== 0 ? oddOffset : 0)
      const y = cy + row * spacingY
      if (dist(x, y, cx, cy) > maxR) continue
      const w = baryWeights(x, y)
      let region: AgtId = 'COG'
      if (w.EMO >= w.COG && w.EMO >= w.ENV) region = 'EMO'
      else if (w.ENV >= w.COG && w.ENV >= w.EMO) region = 'ENV'
      dots.push({ x, y, w, region })
    }
  }
  return dots
}

const FIELD_DOTS = buildFieldDots()
const AGT_IDS: AgtId[] = ['COG', 'EMO', 'ENV']

export function JettUxOverlay({ state, live = false, className = '' }: Props) {
  const { active, weights } = state
  const activeColor = AGT_COLORS[active]

  const paintedDots = useMemo(() => {
    return FIELD_DOTS.map((dot) => {
      const c =
        dot.w.COG * weights.COG +
        dot.w.EMO * weights.EMO +
        dot.w.ENV * weights.ENV
      const a = Math.min(
        1,
        0.1 + c * 0.82 + (dot.region === active ? 0.18 : 0),
      )
      const r = 0.85 + c * 1.25
      return { ...dot, c, a, r, color: AGT_COLORS[dot.region] }
    })
  }, [weights, active])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-sm border border-[#c4a574]/50 bg-[#050505]/95 shadow-[0_0_40px_rgba(255,98,0,0.2)] backdrop-blur-[2px]',
        className,
      )}
      aria-label="JETT AGT simplex gaze HUD"
      data-layout-id="jett-ux-shell"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#c4a574]/25 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.22em] sm:text-[9px]">
        <span className="font-semibold text-[#ff8a33]">JETT · UX</span>
        <span className={live ? 'text-[#fb923c]' : 'text-[#6f6f78]'}>
          {live ? 'gaze live' : 'gaze idle'}
        </span>
      </div>

      {/* SVG body */}
      <div className="relative aspect-square w-full p-2">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full"
          role="img"
          aria-label={`Active tensor ${active}`}
        >
          <defs>
            <filter
              id="jett-ring-glow"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id="jett-node-glow"
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id="jett-center-glow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer ring — tints toward active tensor */}
          <circle
            cx={100}
            cy={100}
            r={96}
            fill="none"
            stroke={activeColor}
            strokeWidth={1.35}
            opacity={0.65}
            filter="url(#jett-ring-glow)"
          />
          <circle
            cx={100}
            cy={100}
            r={96}
            fill="none"
            stroke="rgba(196,165,116,0.55)"
            strokeWidth={1.1}
          />
          <circle
            cx={100}
            cy={100}
            r={91.5}
            fill="rgba(8,8,10,0.45)"
            stroke="rgba(196,165,116,0.2)"
            strokeWidth={0.55}
          />

          {/* Field dots */}
          {paintedDots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={d.color}
              opacity={d.a}
            />
          ))}

          {/* Triangle */}
          <polygon
            points={`${AGT_VERTS.COG.x},${AGT_VERTS.COG.y} ${AGT_VERTS.EMO.x},${AGT_VERTS.EMO.y} ${AGT_VERTS.ENV.x},${AGT_VERTS.ENV.y}`}
            fill="rgba(255,98,0,0.035)"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth={0.85}
          />

          {/* Edges center → verts */}
          {AGT_IDS.map((id) => {
            const v = AGT_VERTS[id]
            const w = weights[id]
            return (
              <line
                key={`edge-${id}`}
                x1={AGT_CENTER.x}
                y1={AGT_CENTER.y}
                x2={v.x}
                y2={v.y}
                stroke={AGT_COLORS[id]}
                strokeWidth={0.55 + w * 1.5}
                opacity={0.22 + w * 0.7}
              />
            )
          })}

          {/* Nodes */}
          {AGT_IDS.map((id) => {
            const v = AGT_VERTS[id]
            const w = weights[id]
            const col = AGT_COLORS[id]
            const isActive = active === id
            const bodyR = 13.5 + w * 4.5
            const haloR = bodyR + (isActive ? 5 : 3.5)
            return (
              <g key={`node-${id}`}>
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={haloR}
                  fill="none"
                  stroke={col}
                  strokeWidth={isActive ? 1.7 : 0.85}
                  opacity={isActive ? 0.85 : 0.3 + w * 0.45}
                  filter={isActive ? 'url(#jett-node-glow)' : undefined}
                />
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={bodyR}
                  fill={`rgba(5,5,5,${0.62 + w * 0.28})`}
                  stroke={col}
                  strokeWidth={isActive ? 2.1 : 1.15}
                  opacity={0.8 + w * 0.2}
                  filter={isActive ? 'url(#jett-node-glow)' : undefined}
                />
                <text
                  x={v.x}
                  y={v.y + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={col}
                  fontSize={8.5}
                  fontWeight={isActive ? 700 : 600}
                  fontFamily='"Space Mono", ui-monospace, monospace'
                  letterSpacing="0.12em"
                  opacity={0.75 + w * 0.25}
                >
                  {id}
                </text>
              </g>
            )
          })}

          {/* Center marker */}
          <circle
            cx={AGT_CENTER.x}
            cy={AGT_CENTER.y}
            r={3.4}
            fill="#ff6200"
            filter="url(#jett-center-glow)"
          />
          <circle
            cx={AGT_CENTER.x}
            cy={AGT_CENTER.y}
            r={1.35}
            fill="#fff7ed"
          />
        </svg>
      </div>

      {/* Footer — compass matches gazeAgt: up COG · down-left EMO · down-right ENV */}
      <div className="flex items-center justify-between border-t border-[#c4a574]/20 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.16em] sm:text-[9px]">
        <span className="font-bold" style={{ color: activeColor }}>
          {active}
        </span>
        <span className="tracking-[0.14em] text-[#6f6f78]">
          <span style={{ color: 'rgba(251,191,36,0.75)' }}>↑COG</span>
          <span className="mx-1 opacity-50">·</span>
          <span style={{ color: 'rgba(244,63,94,0.75)' }}>↙EMO</span>
          <span className="mx-1 opacity-50">·</span>
          <span style={{ color: 'rgba(96,165,250,0.75)' }}>↘ENV</span>
        </span>
      </div>
    </div>
  )
}
