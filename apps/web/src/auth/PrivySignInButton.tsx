import { privyEnabled } from './privyConfig'
import { useXWealthAuth } from './useXWealthAuth'

/**
 * Compact Sign in with Jett Optics (Privy) control for the MOA header / gate panel.
 */
export function PrivySignInButton({
  onWallet,
  className = '',
}: {
  onWallet?: (address: string) => void
  className?: string
}) {
  if (!privyEnabled) {
    return (
      <span
        className={`font-sub rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/35 ${className}`}
        title="Set VITE_PRIVY_APP_ID to enable Jett Optics login"
      >
        Privy off
      </span>
    )
  }

  return <PrivySignInButtonInner onWallet={onWallet} className={className} />
}

function PrivySignInButtonInner({
  onWallet,
  className = '',
}: {
  onWallet?: (address: string) => void
  className?: string
}) {
  const auth = useXWealthAuth(onWallet)

  if (!auth.ready) {
    return (
      <span className={`font-sub px-2.5 py-1 text-[10px] text-white/40 ${className}`}>
        …
      </span>
    )
  }

  if (auth.authenticated) {
    return (
      <button
        type="button"
        onClick={() => void auth.logout()}
        className={`font-sub rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-100 hover:bg-emerald-400/20 ${className}`}
        title="Sign out of Jett Optics (Privy)"
      >
        {auth.userLabel ?? 'signed in'} · out
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => auth.login({ xOnly: true })}
      className={`font-sub rounded-full border border-[#6d8cff]/40 bg-[#6d8cff]/15 px-2.5 py-1 text-[10px] font-medium text-[#c5d4ff] hover:bg-[#6d8cff]/25 ${className}`}
      title="Sign in with Jett Optics Privy · X OAuth"
    >
      Sign in · Jett Optics
    </button>
  )
}
