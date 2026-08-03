/**
 * Canvas-drawn icons for Wealth MOA nodes.
 * Core = brain+circuit · Wealth/Money = currency · else COG / EMO / ENV glyphs.
 */

export type NodeIconKind =
  | 'brain-circuit' // Core-00
  | 'money' // Wealth hub / pay
  | 'cog' // COG tensor
  | 'heart' // EMO tensor
  | 'globe' // ENV tensor
  | 'shield' // JTX gate
  | 'bolt' // dry-run
  | 'plug' // plugin / harness
  | 'agents' // agents hub
  | 'chat' // jtx.chat
  | 'chart' // jtx.trade
  | 'device' // this browser / host
  | 'user' // marketplace @handle
  | 'market' // marketplace hub
  | 'dot'

export function iconKindForNode(n: {
  id: string
  agt: string
  tool?: string
}): NodeIconKind {
  if (n.id === '0-core' || n.agt === 'ROOT') return 'brain-circuit'
  if (n.id === 'mkt-hub' || n.tool === 'market-hub') return 'market'
  if (n.tool === 'market-you' || n.tool === 'market-peer') return 'user'
  if (n.tool === 'market-oauth') return 'user'
  if (n.tool === 'market-pay' || n.tool === 'pay') return 'money'
  if (n.tool === 'market-skills' || n.tool === 'market-skill') return 'plug'
  if (n.id === '8-wealth' || n.tool === 'hub') return 'money'
  if (n.tool === 'gate') return 'shield'
  if (n.tool === 'intent') return 'bolt'
  if (n.tool === 'plugin') return 'plug'
  if (n.tool === 'agents') return 'agents'
  if (n.id === 'link-jtx-chat') return 'chat'
  if (n.id === 'link-jtx-trade') return 'chart'
  if (n.id.startsWith('device-') || n.id === 'device-local') return 'device'
  if (n.id.startsWith('harness-')) return 'plug'
  if (n.agt === 'COG') return 'cog'
  if (n.agt === 'EMO') return 'heart'
  if (n.agt === 'ENV') return 'globe'
  return 'dot'
}

/** Draw centered icon at (cx, cy). Size is roughly the diameter of the glyph. */
export function drawNodeIcon(
  ctx: CanvasRenderingContext2D,
  kind: NodeIconKind,
  cx: number,
  cy: number,
  size: number,
  color = 'rgba(255,255,255,0.92)',
) {
  const s = size
  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(1.1, s * 0.09)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (kind) {
    case 'brain-circuit':
      drawBrainCircuit(ctx, s)
      break
    case 'money':
      drawMoney(ctx, s)
      break
    case 'cog':
      drawCog(ctx, s)
      break
    case 'heart':
      drawHeart(ctx, s)
      break
    case 'globe':
      drawGlobe(ctx, s)
      break
    case 'shield':
      drawShield(ctx, s)
      break
    case 'bolt':
      drawBolt(ctx, s)
      break
    case 'plug':
      drawPlug(ctx, s)
      break
    case 'agents':
      drawAgents(ctx, s)
      break
    case 'chat':
      drawChat(ctx, s)
      break
    case 'chart':
      drawChart(ctx, s)
      break
    case 'device':
      drawDevice(ctx, s)
      break
    case 'user':
      drawUser(ctx, s)
      break
    case 'market':
      drawMarket(ctx, s)
      break
    default:
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2)
      ctx.fill()
  }

  ctx.restore()
}

/** Core-00: neural chip — rounded die + center core + 4 pins */
function drawBrainCircuit(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.32
  const half = u * 0.88
  const rr = u * 0.2

  // Chip body
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-half, -half, half * 2, half * 2, rr)
  } else {
    ctx.rect(-half, -half, half * 2, half * 2)
  }
  ctx.stroke()

  // Neural core (concentric rings = brain/circuit)
  ctx.beginPath()
  ctx.arc(0, 0, u * 0.28, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, u * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // Subtle “cortex” arcs left/right
  ctx.beginPath()
  ctx.arc(-u * 0.08, 0, u * 0.42, -Math.PI * 0.65, Math.PI * 0.65)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(u * 0.08, 0, u * 0.42, Math.PI * 0.35, Math.PI * 1.65)
  ctx.stroke()

  // Four circuit pins
  const pin = u * 0.2
  const edge = half
  for (const [x1, y1, x2, y2] of [
    [0, -edge, 0, -edge - pin],
    [0, edge, 0, edge + pin],
    [-edge, 0, -edge - pin, 0],
    [edge, 0, edge + pin, 0],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x2, y2, Math.max(1.2, s * 0.042), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawMoney(ctx: CanvasRenderingContext2D, s: number) {
  const r = s * 0.32
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.font = `700 ${Math.round(s * 0.42)}px "Neue Haas Unica", "Neue Haas Unica Fallback", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('$', 0, 1)
}

function drawCog(ctx: CanvasRenderingContext2D, s: number) {
  const outer = s * 0.34
  const inner = s * 0.16
  const teeth = 8
  ctx.beginPath()
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2
    const a1 = ((i + 0.35) / teeth) * Math.PI * 2
    const a2 = ((i + 0.5) / teeth) * Math.PI * 2
    const a3 = ((i + 0.85) / teeth) * Math.PI * 2
    const rOut = outer
    const rIn = outer * 0.72
    if (i === 0) ctx.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn)
    ctx.lineTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut)
    ctx.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut)
    ctx.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn)
    ctx.lineTo(Math.cos(a3) * rIn, Math.sin(a3) * rIn)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, inner, 0, Math.PI * 2)
  ctx.stroke()
}

function drawHeart(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.28
  ctx.beginPath()
  ctx.moveTo(0, u * 0.85)
  ctx.bezierCurveTo(-u * 1.4, u * 0.05, -u * 1.15, -u * 1.05, 0, -u * 0.45)
  ctx.bezierCurveTo(u * 1.15, -u * 1.05, u * 1.4, u * 0.05, 0, u * 0.85)
  ctx.closePath()
  ctx.stroke()
}

function drawGlobe(ctx: CanvasRenderingContext2D, s: number) {
  const r = s * 0.32
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.45, r, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-r, 0)
  ctx.lineTo(r, 0)
  ctx.moveTo(0, -r)
  ctx.lineTo(0, r)
  ctx.stroke()
}

function drawShield(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.32
  ctx.beginPath()
  ctx.moveTo(0, -u)
  ctx.lineTo(u * 0.85, -u * 0.55)
  ctx.lineTo(u * 0.85, u * 0.15)
  ctx.quadraticCurveTo(u * 0.85, u * 0.85, 0, u * 1.05)
  ctx.quadraticCurveTo(-u * 0.85, u * 0.85, -u * 0.85, u * 0.15)
  ctx.lineTo(-u * 0.85, -u * 0.55)
  ctx.closePath()
  ctx.stroke()
  // check
  ctx.beginPath()
  ctx.moveTo(-u * 0.28, u * 0.05)
  ctx.lineTo(-u * 0.05, u * 0.28)
  ctx.lineTo(u * 0.35, -u * 0.22)
  ctx.stroke()
}

function drawBolt(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.3
  ctx.beginPath()
  ctx.moveTo(u * 0.15, -u)
  ctx.lineTo(-u * 0.35, u * 0.1)
  ctx.lineTo(u * 0.05, u * 0.1)
  ctx.lineTo(-u * 0.15, u)
  ctx.lineTo(u * 0.35, -u * 0.1)
  ctx.lineTo(-u * 0.05, -u * 0.1)
  ctx.closePath()
  ctx.stroke()
}

function drawPlug(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.28
  ctx.strokeRect(-u * 0.7, -u * 0.35, u * 0.9, u * 0.7)
  ctx.beginPath()
  ctx.moveTo(u * 0.2, -u * 0.2)
  ctx.lineTo(u * 0.75, -u * 0.2)
  ctx.moveTo(u * 0.2, u * 0.2)
  ctx.lineTo(u * 0.75, u * 0.2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-u * 0.7, -u * 0.15)
  ctx.lineTo(-u * 1.05, -u * 0.15)
  ctx.moveTo(-u * 0.7, u * 0.15)
  ctx.lineTo(-u * 1.05, u * 0.15)
  ctx.stroke()
}

function drawAgents(ctx: CanvasRenderingContext2D, s: number) {
  const r = s * 0.11
  // three heads
  for (const [x, y] of [
    [0, -s * 0.18],
    [-s * 0.22, s * 0.08],
    [s * 0.22, s * 0.08],
  ] as const) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y + r * 2.1, r * 1.35, Math.PI * 1.05, Math.PI * 1.95)
    ctx.stroke()
  }
}

function drawChat(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.3
  ctx.beginPath()
  ctx.roundRect(-u, -u * 0.7, u * 2, u * 1.35, u * 0.35)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-u * 0.25, u * 0.55)
  ctx.lineTo(-u * 0.45, u * 1.05)
  ctx.lineTo(u * 0.15, u * 0.55)
  ctx.stroke()
}

function drawChart(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.3
  ctx.beginPath()
  ctx.moveTo(-u, u * 0.7)
  ctx.lineTo(-u, -u * 0.7)
  ctx.moveTo(-u, u * 0.7)
  ctx.lineTo(u, u * 0.7)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-u * 0.7, u * 0.35)
  ctx.lineTo(-u * 0.15, -u * 0.15)
  ctx.lineTo(u * 0.2, u * 0.1)
  ctx.lineTo(u * 0.75, -u * 0.55)
  ctx.stroke()
}

function drawDevice(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.32
  ctx.strokeRect(-u, -u * 0.65, u * 2, u * 1.25)
  ctx.beginPath()
  ctx.moveTo(-u * 0.35, u * 0.75)
  ctx.lineTo(u * 0.35, u * 0.75)
  ctx.stroke()
}

function drawUser(ctx: CanvasRenderingContext2D, s: number) {
  const r = s * 0.16
  ctx.beginPath()
  ctx.arc(0, -s * 0.12, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, r * 1.85, r * 1.55, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()
}

function drawMarket(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.28
  // storefront awning
  ctx.beginPath()
  ctx.moveTo(-u, -u * 0.2)
  ctx.lineTo(-u, -u * 0.85)
  ctx.lineTo(u, -u * 0.85)
  ctx.lineTo(u, -u * 0.2)
  ctx.stroke()
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.arc((i * u) / 2.5, -u * 0.2, u * 0.18, Math.PI, 0)
    ctx.stroke()
  }
  ctx.strokeRect(-u * 0.75, -u * 0.15, u * 1.5, u * 1.1)
  ctx.strokeRect(-u * 0.2, u * 0.25, u * 0.4, u * 0.7)
}
