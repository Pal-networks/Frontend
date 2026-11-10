import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PrivyProvider, useLogin, useLogout, usePrivy } from '@privy-io/react-auth'
import { useCreateWallet, useSignRawHash } from '@privy-io/react-auth/extended-chains'
import { Account } from 'near-api-js'
import { config } from '../config'
import { getBalance, provider } from '../near/rpc'
import { setNearAccount } from '../near/session'
import { PrivySigner, type SignRawHash } from '../near/signer'
import { forgetVaultLink, navigate } from '../router'
import { AuthContext, type AuthValue, type Balance } from './context'
import { friendlyError } from './errors'

function Inner({ children }: { children: ReactNode }) {
  const { ready, authenticated, user } = usePrivy()
  const { createWallet } = useCreateWallet()
  const { signRawHash } = useSignRawHash()
  const [balance, setBalance] = useState<Balance | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const creatingWallet = useRef(false)

  const { login } = useLogin({
    onError: (code) => {
      // Closing the Privy window is not an error worth shouting about.
      if (code !== 'exited_auth_flow') setError(friendlyError(code))
    },
  })
  const { logout } = useLogout()

  // Short event log, shown on screen while developing and in the console.
  const [debug, setDebug] = useState<string[]>([])
  const note = useCallback((msg: string) => {
    console.info('[pal]', msg)
    setDebug((d) => [...d.slice(-11), `${new Date().toLocaleTimeString()}  ${msg}`])
  }, [])

  // The person's NEAR wallet. Users can also hold other wallets, so look for the NEAR one.
  const accountId = useMemo(() => {
    if (!authenticated || !user) return null
    const wallet = user.linkedAccounts.find((a) => a.type === 'wallet' && (a as { chainType?: string }).chainType === 'near')
    return (wallet as { address?: string } | undefined)?.address ?? null
  }, [authenticated, user])

  // Build the account that signs with Privy, and make it available for transactions.
  const signRef = useRef(signRawHash)
  useEffect(() => {
    signRef.current = signRawHash
  }, [signRawHash])
  useEffect(() => {
    if (!accountId) {
      setNearAccount(null)
      return
    }
    const sign: SignRawHash = (input) => signRef.current(input)
    setNearAccount(new Account(accountId, provider, new PrivySigner(sign, accountId)))
    note(`NEAR account ready: ${accountId.slice(0, 12)}…`)
    return () => setNearAccount(null)
  }, [accountId, note])

  // Makes a NEAR wallet for this person. Runs once per login, never in a loop.
  const makeNearWallet = useCallback(async () => {
    if (creatingWallet.current) return
    creatingWallet.current = true
    setError(null)
    setBusy(true)
    note('asking Privy to create a NEAR wallet…')
    try {
      const out = await createWallet({ chainType: 'near' })
      note(`NEAR wallet created: ${out.wallet.address}`)
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
      note(`could not create NEAR wallet: ${msg}`)
      console.error('[pal] could not create NEAR wallet:', e)
      setError(`Could not create your NEAR account. ${friendlyError(e)}`)
    } finally {
      creatingWallet.current = false
      setBusy(false)
    }
  }, [createWallet, note])

  // After email/Google login, try once automatically for each person.
  const triedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || !authenticated || !user || accountId) return
    if (triedFor.current === user.id) return
    triedFor.current = user.id
    void makeNearWallet()
  }, [ready, authenticated, user, accountId, makeNearWallet])

  const refreshBalance = useCallback(async () => {
    if (!accountId) return
    try {
      const b = await getBalance(accountId)
      setBalance({ exists: b.exists, near: b.near })
    } catch (e) {
      setError(`Could not read your balance. ${friendlyError(e)}`)
    }
  }, [accountId])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance])

  const logOut = useCallback(async () => {
    setError(null)
    setBalance(null)
    triedFor.current = null
    // Leave the vault first, so its address is not kept for the next sign-in.
    forgetVaultLink()
    navigate('/')
    await logout()
  }, [logout])

  const email = user?.email?.address ?? user?.google?.email ?? null

  const value: AuthValue = {
    ready,
    loggedIn: authenticated,
    email,
    accountId,
    balance,
    busy,
    error,
    clearError: () => setError(null),
    logIn: () => {
      setError(null)
      login({ loginMethods: ['email', 'google'] })
    },
    debug,
    retryNearWallet: makeNearWallet,
    refreshBalance,
    signHash: async (hash) => {
      if (!accountId) throw new Error('Your NEAR account is not ready yet.')
      const { signature } = await signRef.current({ address: accountId, chainType: 'near', hash })
      return signature
    },
    logOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={config.privyAppId}
      clientId={config.privyClientId}
      config={{
        loginMethods: ['email', 'google'],
        appearance: { theme: 'light', accentColor: '#7357e6' },
        // We create the NEAR wallet ourselves. Privy's automatic creation covers only
        // Ethereum and Solana, and its "Creating your wallet" screen can get stuck.
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, solana: { createOnLogin: 'off' } },
      }}
    >
      <Inner>{children}</Inner>
    </PrivyProvider>
  )
}
