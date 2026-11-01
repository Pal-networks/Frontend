import { createContext, useContext } from 'react'

export interface Balance {
  exists: boolean
  near: string
}

export interface AuthValue {
  /** Privy has finished loading. */
  ready: boolean
  /** Logged in with email or Google. */
  loggedIn: boolean
  email: string | null
  /** The person's NEAR account (their Privy wallet), once it exists. */
  accountId: string | null
  balance: Balance | null
  busy: boolean
  error: string | null
  clearError: () => void
  logIn: () => void
  /** Recent events, for diagnosing problems while developing. */
  debug: string[]
  /** Try again to create the NEAR account. */
  retryNearWallet: () => Promise<void>
  refreshBalance: () => Promise<void>
  logOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
