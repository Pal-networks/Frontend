import { useCallback, useEffect, useState } from 'react'
import { friendlyError } from '../auth/errors'
import { getRules, getStatus, type Rules, type Status } from '../near/vaultApi'

interface VaultData {
  rules: Rules | null
  status: Status | null
  error: string | null
  loading: boolean
}

/** Reads a vault from the blockchain and keeps it fresh (every 8 seconds). */
export function useVault(vaultId: number) {
  const [data, setData] = useState<VaultData>({ rules: null, status: null, error: null, loading: true })

  const load = useCallback(async () => {
    try {
      const [rules, status] = await Promise.all([getRules(vaultId), getStatus(vaultId)])
      setData({ rules, status, error: null, loading: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const error = /vault not found/i.test(msg) ? 'This vault does not exist.' : `Could not read this vault. ${friendlyError(e)}`
      setData((d) => ({ ...d, error, loading: false }))
    }
  }, [vaultId])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(timer)
  }, [load])

  return { ...data, reload: load }
}

/** The current time in milliseconds, updated every second (for countdowns). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}

/** Runs one action at a time, tracks "working" and the error, then refreshes the vault. */
export function useAction(reload: () => Promise<void>) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>, done?: string) => {
      setBusy(label)
      setError(null)
      setMessage(null)
      try {
        await fn()
        if (done) setMessage(done)
        await reload()
      } catch (e) {
        setError(friendlyError(e))
      } finally {
        setBusy(null)
      }
    },
    [reload],
  )

  return { busy, error, message, run, clear: () => (setError(null), setMessage(null)) }
}
