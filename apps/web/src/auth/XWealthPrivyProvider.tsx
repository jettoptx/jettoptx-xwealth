import type { ReactNode } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { PRIVY_APP_ID, XWEALTH_PRIVY_CONFIG, privyEnabled } from './privyConfig'

/**
 * Wraps the app when VITE_PRIVY_APP_ID is set.
 * If missing, renders children only (wallet paste path still works).
 */
export function XWealthPrivyProvider({ children }: { children: ReactNode }) {
  if (!privyEnabled) {
    return <>{children}</>
  }

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={XWEALTH_PRIVY_CONFIG}>
      {children}
    </PrivyProvider>
  )
}
