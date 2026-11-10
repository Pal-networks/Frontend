import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { friendlyError } from '../auth/errors'
import { getTelegramStatus, startTelegramLink, stopTelegramAlerts, type TelegramStatus } from '../telegram/telegramApi'
import { Icon } from './Icon'
import { ErrorLine } from './Messages'

/** "Connect Telegram" in the account window. Shown only where the site has alerts set up. */
export function TelegramAlerts({ accountId }: { accountId: string }) {
  const { signHash } = useAuth()
  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const check = useCallback(async () => {
    try {
      setStatus(await getTelegramStatus(accountId))
    } catch (e) {
      setError(friendlyError(e))
    }
  }, [accountId])

  useEffect(() => {
    void check()
  }, [check])

  // While the person is in Telegram, look every few seconds for the connection to finish.
  useEffect(() => {
    if (!link || status?.linked) return
    const t = window.setInterval(() => void check(), 3000)
    return () => window.clearInterval(t)
  }, [link, status?.linked, check])

  const act = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  if (!status) {
    return error ? null : <div className="skeleton sk-line" style={{ width: '60%' }} aria-busy="true" aria-label="Checking Telegram alerts" />
  }
  if (!status.available) return null

  return (
    <div className="field">
      <span className="label">Telegram alerts</span>

      {status.linked ? (
        <div className="row">
          <span className="telegram-on">
            <Icon name="check" />
            {status.telegram ? `Connected as ${status.telegram}` : 'Connected'}
          </span>
          <button
            className="btn small"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await stopTelegramAlerts(accountId, signHash)
                setLink(null)
                await check()
              })
            }
          >
            {busy ? 'Turning off…' : 'Turn off'}
          </button>
        </div>
      ) : link ? (
        <>
          <a className="btn primary" href={link} target="_blank" rel="noreferrer">
            <Icon name="send" />
            Open Telegram
          </a>
          <p className="hint">In Telegram, press Start. This window updates when you are connected. The link works for 15 minutes.</p>
        </>
      ) : (
        <>
          <button className="btn" disabled={busy} onClick={() => act(async () => setLink(await startTelegramLink(accountId, signHash)))}>
            <Icon name="notifications" />
            {busy ? 'Preparing…' : 'Connect Telegram'}
          </button>
          <p className="hint">Get a message when it is time to check in, when a release starts, and when it is done.</p>
        </>
      )}

      {error && <ErrorLine message={error} />}
    </div>
  )
}
