/**
 * MDX-style node detail panel — mounts live tools for each MOA node.
 */
import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { GlassObject } from '@/components/canvasui/GlassObject'
import { EXHIBIT, buildDryRunIntent } from '@/lib/exhibit'
import { AGT, type WealthNode } from '@/lib/wealth-moa'
import {
  checkJtxGate,
  type JtxGateResult,
} from '@/lib/jtxGate'
import { decodeQrFromFile } from '@/lib/decodeQr'
import { parseTransferPayload, type TransferResolve } from '@/lib/xMoneyTransfer'
import { cn } from '@/lib/utils'

const DEFAULT_GLASS = '/qr-glass.svg'

export type SharedExhibitState = {
  wallet: string
  setWallet: (v: string) => void
  gate: JtxGateResult | null
  setGate: (g: JtxGateResult | null) => void
  gateBusy: boolean
  setGateBusy: (b: boolean) => void
  pasteUrl: string
  setPasteUrl: (v: string) => void
  decode: TransferResolve | null
  setDecode: (d: TransferResolve | null) => void
  previewSrc: string
  setPreviewSrc: (s: string) => void
  status: string
  setStatus: (s: string) => void
}

export function NodeDetailPanel({
  node,
  onClose,
  state,
}: {
  node: WealthNode
  onClose: () => void
  state: SharedExhibitState
}) {
  const agt = AGT[node.agt]
  const intent = buildDryRunIntent({
    handle: state.decode?.handle ?? null,
    transferUrl: state.decode?.transferUrl ?? null,
    kind: state.decode?.kind ?? null,
    wallet: state.wallet,
    gateOk: state.gate?.ok ?? null,
    jtxAmount: state.gate?.uiAmount ?? null,
  })

  return (
    <aside
      className="pointer-events-auto flex h-full max-h-full w-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#080808]/92 shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      style={{ borderColor: `${agt.color}44` }}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
        <div className="min-w-0">
          <p className="font-sub text-[9px] uppercase tracking-[0.2em] text-white/40">
            {node.digit ? `AUGMENT ${node.digit}` : 'NODE'} · {agt.label}
          </p>
          <h2 className="font-title mt-0.5 text-lg font-semibold tracking-tight text-[#F0EDE8]">
            {node.label}
          </h2>
          <p className="font-sub mt-1.5 text-[11px] leading-relaxed text-white/55">
            {node.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {node.subLabels.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-sub text-[9px] text-white/50"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-white/12 px-2 py-1 font-sub text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Close panel"
        >
          ✕
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
        {node.panel === 'hub' && <HubBody node={node} state={state} intent={intent} />}
        {node.panel === 'gate' && <GateBody state={state} />}
        {node.panel === 'pay' && <PayBody state={state} />}
        {node.panel === 'intent' && <IntentBody intent={intent} state={state} />}
        {(node.panel === 'rail' || node.panel === 'link' || node.panel === 'info') && (
          <RailBody node={node} />
        )}
      </div>

      <footer className="shrink-0 border-t border-white/[0.08] px-4 py-2">
        <AgtBars cog={node.cog} emo={node.emo} env={node.env} />
      </footer>
    </aside>
  )
}

function HubBody({
  node,
  state,
  intent,
}: {
  node: WealthNode
  state: SharedExhibitState
  intent: ReturnType<typeof buildDryRunIntent>
}) {
  return (
    <div className="space-y-3">
      <MdxBlock title="Harness plug">
        <pre className="overflow-x-auto font-mono text-[11px] text-emerald-200/90">
          {node.plug}
        </pre>
        <CopyBtn text={node.plug ?? ''} label="Copy install" />
      </MdxBlock>
      <MdxBlock title="Live status">
        <ul className="space-y-1 font-sub text-[11px] text-white/65">
          <li>
            Gate:{' '}
            <span className={state.gate?.ok ? 'text-emerald-300' : 'text-amber-200'}>
              {state.gate?.ok
                ? `PASS (${state.gate.uiAmount} JTX)`
                : state.gate
                  ? 'FAIL'
                  : 'unchecked — open JTX Gate node'}
            </span>
          </li>
          <li>
            X Money:{' '}
            {state.decode?.ok ? `@${state.decode.handle}` : 'none — open X Money node'}
          </li>
          <li>Policy: dry-run · LIVE blocked</li>
        </ul>
      </MdxBlock>
      <MdxBlock title="Dry-run snapshot">
        <pre className="max-h-36 overflow-auto font-mono text-[9px] text-sky-100/80">
          {JSON.stringify(intent, null, 2)}
        </pre>
      </MdxBlock>
    </div>
  )
}

function GateBody({ state }: { state: SharedExhibitState }) {
  async function run() {
    const w = state.wallet.trim()
    state.setGateBusy(true)
    const result = await checkJtxGate(w)
    state.setGate(result)
    state.setGateBusy(false)
    state.setStatus(
      result.ok
        ? `Gate PASS · ${result.uiAmount} JTX`
        : `Gate FAIL · ${result.error ?? 'need ≥1 JTX'}`,
    )
  }

  return (
    <div className="space-y-3">
      <MdxBlock title="Agent wallet">
        <input
          value={state.wallet}
          onChange={(e) => state.setWallet(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run()
          }}
          placeholder="Solana pubkey"
          className="w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 font-mono text-xs text-white outline-none ring-emerald-400/40 focus:ring-1"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={state.gateBusy}
          className="mt-2 w-full rounded-xl bg-[#30b8ff] py-2.5 text-sm font-medium text-black disabled:opacity-50"
        >
          {state.gateBusy ? 'Checking…' : 'Check JTX ≥1'}
        </button>
        <p className="mt-2 font-sub text-[10px] text-white/40">
          Mint {EXHIBIT.mintShort} · POST /api/solana-rpc
        </p>
      </MdxBlock>
      {state.gate && (
        <MdxBlock
          title={state.gate.ok ? 'PASS' : 'FAIL'}
          tone={state.gate.ok ? 'green' : 'amber'}
        >
          <p className="text-2xl font-semibold text-white">
            {state.gate.uiAmount ?? '—'}{' '}
            <span className="text-sm text-white/50">JTX</span>
          </p>
          <p className="mt-1 break-all font-mono text-[10px] text-white/50">
            {state.gate.error ?? state.gate.wallet}
          </p>
        </MdxBlock>
      )}
      <MdxBlock title="Hermes plug">
        <pre className="font-mono text-[10px] text-violet-100/85">
{`export SOLANA_WALLET=<pubkey>
npm run check-jtx
# exit 0 = pass`}
        </pre>
        <CopyBtn
          text="export SOLANA_WALLET=<pubkey>\nnpm run check-jtx"
          label="Copy CLI"
        />
      </MdxBlock>
    </div>
  )
}

function PayBody({ state }: { state: SharedExhibitState }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, on: false })
  const stageRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  function onPaste() {
    const d = parseTransferPayload(state.pasteUrl, 'paste')
    state.setDecode(d)
    state.setStatus(
      d.ok ? `Resolved @${d.handle}` : d.note ?? 'not X Money',
    )
  }

  async function onFile(file: File | null) {
    if (!file) return
    setBusy(true)
    state.setStatus(`Decoding ${file.name}…`)
    try {
      const result = await decodeQrFromFile(file)
      const preview = result.cropPreviewUrl ?? result.fullPreviewUrl
      if (result.cropPreviewUrl && result.fullPreviewUrl !== result.cropPreviewUrl) {
        URL.revokeObjectURL(result.fullPreviewUrl)
      }
      if (state.previewSrc.startsWith('blob:')) {
        URL.revokeObjectURL(state.previewSrc)
      }
      state.setPreviewSrc(preview)
      state.setDecode(result.decode)
      state.setStatus(
        result.decode.ok
          ? `QR · @${result.decode.handle}`
          : result.decode.note ?? 'no X Money',
      )
    } catch (e) {
      state.setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function onMove(e: ReactMouseEvent) {
    const el = stageRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 2 - 1
    const y = ((e.clientY - r.top) / r.height) * 2 - 1
    setTilt({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
      on: true,
    })
  }

  const resolved = state.decode

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <input
          value={state.pasteUrl}
          onChange={(e) => state.setPasteUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onPaste()
          }}
          placeholder="x.com/i/money/… or @handle"
          className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/50 px-3 py-2 font-sub text-xs text-white outline-none focus:ring-1 focus:ring-[#30b8ff]/50"
        />
        <button
          type="button"
          onClick={onPaste}
          className="rounded-xl bg-[#1d9bf0] px-3 py-2 font-sub text-xs font-medium text-white"
        >
          Resolve
        </button>
      </div>

      <div
        ref={stageRef}
        className="relative h-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#0a0d16] [perspective:800px]"
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0, on: false })}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{
            backgroundImage:
              "url('/jett-optx-bg-dark.jpg'), radial-gradient(circle, rgba(255,255,255,0.1) 0.5px, transparent 0.6px)",
            backgroundSize: "cover, 16px 16px",
            backgroundPosition: "center, center",
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: tilt.on
              ? `rotateX(${-tilt.y * 8}deg) rotateY(${tilt.x * 10}deg) scale(1.03)`
              : undefined,
            transition: tilt.on ? 'transform 90ms' : 'transform 400ms ease',
          }}
        >
          {state.previewSrc ? (
            <div className="h-[140px] w-[140px] overflow-hidden rounded-[18px] border border-white/50 bg-gradient-to-br from-white to-sky-100 p-2.5 shadow-xl">
              <img
                src={state.previewSrc}
                alt="QR"
                className="h-full w-full rounded-lg bg-black object-contain p-1"
              />
            </div>
          ) : (
            <div className="relative h-[150px] w-[150px]">
              <GlassObject
                src={DEFAULT_GLASS}
                ior={1.55}
                thickness={3}
                roughness={0.18}
                dispersion={1.1}
                clearcoat={0.6}
                depth={0.18}
                bevel={0.6}
                environmentIntensity={1.3}
                scale={2.1}
                floatIntensity={0.5}
                rotationIntensity={0.4}
                floatSpeed={1.2}
                fov={50}
                cameraDistance={3.8}
                orbit={false}
                highlight="#1d9bf0"
                background=""
                backgroundImage=""
                className="absolute inset-0 h-full w-full !min-h-0"
                style={{ height: '100%', width: '100%', background: 'transparent' }}
              />
            </div>
          )}
        </div>
        <label className="absolute bottom-2 left-1/2 -translate-x-1/2 cursor-pointer rounded-lg border border-[#1d9bf0]/40 bg-[#1d9bf0]/25 px-3 py-1 font-sub text-[10px] text-sky-100">
          {busy ? '…' : 'Load QR'}
          <input
            type="file"
            accept="*/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Meta k="Handle" v={resolved?.handle ? `@${resolved.handle}` : '—'} />
        <Meta k="Kind" v={resolved?.kind ?? '—'} />
      </div>
      {resolved?.transferUrl && (
        <div className="flex gap-1.5">
          <CopyBtn text={resolved.transferUrl} label="Copy link" />
          <a
            href={resolved.transferUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 px-2.5 py-1 font-sub text-[10px] text-white/70"
          >
            Open X Money
          </a>
        </div>
      )}
    </div>
  )
}

function IntentBody({
  intent,
  state,
}: {
  intent: ReturnType<typeof buildDryRunIntent>
  state: SharedExhibitState
}) {
  const json = JSON.stringify(intent, null, 2)
  return (
    <div className="flex min-h-[50dvh] flex-col gap-3">
      <MdxBlock title="Policy">
        <p className="text-xs text-white/70">
          Exhibit + agent default: <strong className="text-emerald-300">dry-run only</strong>.
          LIVE settlement is blocked until explicit operator approval.
        </p>
        <p className="mt-2 font-sub text-[10px] text-white/40">{state.status}</p>
      </MdxBlock>
      <MdxBlock title="Intent JSON" tone="blue" className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-[200px] flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-white/10 bg-black/40 p-2">
          <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-sky-100/90">
            {json}
          </pre>
        </div>
        <CopyBtn text={json} label="Copy for harness" />
      </MdxBlock>
      <MdxBlock title="CLI">
        <pre className="font-mono text-[10px] text-violet-100/85">
{`npm run dry-run
# LIVE always blocked without flag`}
        </pre>
      </MdxBlock>
    </div>
  )
}

function RailBody({ node }: { node: WealthNode }) {
  return (
    <div className="space-y-3">
      {node.plug && (
        <MdxBlock title="Plug command">
          <pre className="overflow-x-auto font-mono text-[11px] text-emerald-200/90">
            {node.plug}
          </pre>
          <CopyBtn text={node.plug} label="Copy" />
        </MdxBlock>
      )}
      {node.externalHref && (
        <a
          href={node.externalHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl border border-white/12 bg-white/[0.04] px-3 py-3 font-sub text-xs text-white/80 transition hover:bg-white/[0.08]"
        >
          <span>Open external</span>
          <span className="text-white/40">↗</span>
        </a>
      )}
      <MdxBlock title="Harness note">
        <p className="text-xs leading-relaxed text-white/65">
          This node is a port on the user&apos;s AI harness — install skill / set env /
          invoke tool. The MOA card is the visual; the plug string is the wire.
        </p>
      </MdxBlock>
    </div>
  )
}

function MdxBlock({
  title,
  children,
  tone = 'default',
  className,
}: {
  title: string
  children: ReactNode
  tone?: 'default' | 'green' | 'amber' | 'blue'
  className?: string
}) {
  const t = {
    default: 'border-white/10 bg-black/40',
    green: 'border-emerald-400/25 bg-emerald-950/50',
    amber: 'border-amber-400/25 bg-amber-950/50',
    blue: 'border-sky-400/25 bg-sky-950/50',
  }[tone]
  return (
    <section className={cn('rounded-xl border px-3 py-2.5', t, className)}>
      <h3 className="font-sub text-[10px] uppercase tracking-[0.14em] text-white/45">
        {title}
      </h3>
      <div className="mt-2 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5">
      <div className="font-sub text-[9px] uppercase text-white/40">{k}</div>
      <div className="truncate font-mono text-[11px] text-white/90">{v}</div>
    </div>
  )
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      className="mt-2 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 font-sub text-[10px] text-white/75 hover:bg-white/[0.08]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setOk(true)
          window.setTimeout(() => setOk(false), 1200)
        } catch {
          /* ignore */
        }
      }}
    >
      {ok ? 'Copied' : label}
    </button>
  )
}

function AgtBars({ cog, emo, env }: { cog: number; emo: number; env: number }) {
  const rows = [
    { k: 'COG', v: cog, c: AGT.COG.color },
    { k: 'EMO', v: emo, c: AGT.EMO.color },
    { k: 'ENV', v: env, c: AGT.ENV.color },
  ]
  return (
    <div className="flex gap-3">
      {rows.map((r) => (
        <div key={r.k} className="flex-1">
          <div className="mb-0.5 flex justify-between font-sub text-[9px] text-white/40">
            <span>{r.k}</span>
            <span>{r.v}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${r.v}%`, background: r.c }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

