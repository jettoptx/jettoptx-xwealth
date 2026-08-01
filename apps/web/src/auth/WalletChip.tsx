/**
 * Agent-harness identity chip.
 * Shows pasted / env / Privy-linked wallet + JTX gate state.
 */
export function WalletChip({
  wallet,
  gateOk,
}: {
  wallet?: string | null
  gateOk?: boolean | null
}) {
  const short =
    wallet && wallet.length >= 8
      ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
      : null

  if (!short) {
    return (
      <span
        className="font-sub rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[10px] tracking-wide text-white/45"
        title="Paste agent Solana pubkey on Gate"
      >
        no agent wallet
      </span>
    )
  }

  const ok = gateOk === true
  const fail = gateOk === false

  return (
    <span
      className={
        ok
          ? 'font-sub rounded-full border border-emerald-400/35 bg-emerald-400/12 px-2.5 py-1 font-mono text-[10px] text-emerald-200'
          : fail
            ? 'font-sub rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 font-mono text-[10px] text-amber-100'
            : 'font-sub rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-white/70'
      }
      title={wallet ?? undefined}
    >
      {ok ? '● ' : fail ? '○ ' : ''}
      {short}
    </span>
  )
}
