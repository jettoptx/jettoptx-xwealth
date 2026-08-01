import { useCallback, useEffect, useMemo } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { XWEALTH_LOGIN_OPTIONS } from './privyConfig'

export type XWealthAuth = {
  ready: boolean
  authenticated: boolean
  userLabel: string | null
  /** X/Twitter handle without @ when linked via Privy */
  twitterUsername: string | null
  twitterDisplayName: string | null
  /** Preferred Solana address from Privy linked accounts, if any */
  solanaAddress: string | null
  /** Opens Privy modal — X/Twitter preferred */
  login: (opts?: { xOnly?: boolean }) => void
  logout: () => Promise<void>
}

function looksLikeSolanaAddress(addr: string | undefined | null): addr is string {
  if (!addr || addr.startsWith('0x')) return false
  return addr.length >= 32 && addr.length <= 48 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)
}

/**
 * Must be used under XWealthPrivyProvider when VITE_PRIVY_APP_ID is set.
 */
export function useXWealthAuth(
  onSolanaAddress?: (address: string) => void,
): XWealthAuth {
  const { ready, authenticated, user, login, logout } = usePrivy()

  const twitterUsername = useMemo(() => {
    const u = user?.twitter?.username
    return u ? u.replace(/^@/, '') : null
  }, [user])

  const twitterDisplayName = useMemo(() => {
    return user?.twitter?.name?.trim() || null
  }, [user])

  const solanaAddress = useMemo(() => {
    if (!user) return null

    const uw = user.wallet?.address
    if (looksLikeSolanaAddress(uw)) return uw

    for (const a of user.linkedAccounts ?? []) {
      const any = a as {
        type?: string
        address?: string
        chainType?: string
      }
      if (any.chainType === 'solana' && looksLikeSolanaAddress(any.address)) {
        return any.address
      }
      if (
        (any.type === 'wallet' || any.type === 'smart_wallet') &&
        looksLikeSolanaAddress(any.address)
      ) {
        return any.address
      }
    }
    return null
  }, [user])

  useEffect(() => {
    if (solanaAddress && onSolanaAddress) {
      onSolanaAddress(solanaAddress)
    }
  }, [solanaAddress, onSolanaAddress])

  const userLabel = useMemo(() => {
    if (!user) return null
    if (twitterUsername) return `@${twitterUsername}`
    if (solanaAddress) {
      return `${solanaAddress.slice(0, 4)}…${solanaAddress.slice(-4)}`
    }
    return 'signed in'
  }, [user, solanaAddress, twitterUsername])

  const doLogin = useCallback(
    (opts?: { xOnly?: boolean }) => {
      login({
        loginMethods: opts?.xOnly
          ? ['twitter']
          : [...XWEALTH_LOGIN_OPTIONS.loginMethods],
      })
    },
    [login],
  )

  const doLogout = useCallback(async () => {
    await logout()
  }, [logout])

  return {
    ready,
    authenticated,
    userLabel,
    twitterUsername,
    twitterDisplayName,
    solanaAddress,
    login: doLogin,
    logout: doLogout,
  }
}
