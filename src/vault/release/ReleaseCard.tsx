import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/context'
import { friendlyError } from '../../auth/errors'
import { ConfirmButton } from '../../components/ConfirmButton'
import { Icon } from '../../components/Icon'
import { ErrorLine, InfoLine, SuccessLine } from '../../components/Messages'
import { explorerTx } from '../../eth/sepolia'
import { getVaultEthAddress } from '../../near/deriveAddress'
import { sendVaultCall, type Rules, type Status } from '../../near/vaultApi'
import { RevealHeirs } from './RevealHeirs'
import { releaseState, runRelease } from './runRelease'

type View = 'checking' | 'ready' | 'running' | 'done' | 'failed'

const guardiansWord = (n: number) => `${n} guardian${n === 1 ? '' : 's'}`

/**
 * Shown when the countdown has ended. As many guardians as had to approve
 * each press Release funds; the last press makes the payments. Payments
 * already made are not repeated. The owner sees the progress. Starting the
 * vault again is in Settings.
 */
export function ReleaseCard({ rules, status, reload, isOwner }: { rules: Rules; status: Status; reload: () => Promise<void>; isOwner: boolean }) {
  const { accountId } = useAuth()
  const [view, setView] = useState<View>('checking')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState<{ hash: string; who: string }[]>([])

  const needsReveal = rules.heirs_hidden && rules.heirs.length === 0
  const hasHeirs = rules.heirs.length > 0
  const summary = rules.heirs.map((h, i) => `${h.label || `Heir ${i + 1}`} (${h.bps / 100}%)`).join(', ')

  const run = useCallback(
    async (current: Status) => {
      setError(null)
      setView('running')
      try {
        const address = await getVaultEthAddress(rules.vault_id)
        await runRelease(rules, current, address, setProgress, (hash, who) => setPaid((p) => [...p, { hash, who }]))
        await reload()
        setView('done')
      } catch (e) {
        setError(friendlyError(e))
        setView('ready')
      }
    },
    [rules, reload],
  )

  // Only looks at where the release stands. Nothing is sent until someone presses the button.
  const heirCount = rules.heirs.length
  useEffect(() => {
    if (heirCount === 0) return
    let cancelled = false
    getVaultEthAddress(rules.vault_id)
      .then((address) => releaseState(rules, status, address))
      .then((s) => !cancelled && setView(s.kind === 'todo' ? 'ready' : s.kind))
      .catch((e) => {
        if (cancelled) return
        setError(friendlyError(e))
        setView('ready')
      })
    return () => {
      cancelled = true
    }
    // Checked once when the card appears, not on every refresh of the status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules.vault_id, heirCount])

  // An older contract has no confirmations: one guardian's press is enough there.
  const confirmations = status.release_confirmations
  const needsConfirming = confirmations !== undefined
  const confirmedCount = confirmations?.length ?? 0
  const enoughConfirmed = !needsConfirming || confirmedCount >= rules.threshold
  const iConfirmed = !!accountId && !!confirmations?.includes(accountId)
  const stillNeeded = Math.max(0, rules.threshold - confirmedCount)

  /** Records this guardian's press. If it was the last one needed, the payments go out. */
  const confirmAndMaybeRun = async () => {
    setError(null)
    setView('running')
    setProgress('Recording that you pressed Release funds…')
    try {
      const count = Number(await sendVaultCall('confirm_release', { vault_id: rules.vault_id }))
      await reload()
      if (count >= rules.threshold) await run(status)
      else setView('ready')
    } catch (e) {
      setError(friendlyError(e))
      setView('ready')
    }
  }

  const retry = async () => {
    setError(null)
    setView('running')
    try {
      setProgress('Clearing the failed payment…')
      await sendVaultCall('reset_execution', { vault_id: rules.vault_id })
      await reload()
      await run({ ...status, execution_started: false, execution_base_nonce: null })
    } catch (e) {
      setError(friendlyError(e))
      setView('failed')
    }
  }

  return (
    <section className="card">
      <h2>Release</h2>

      {needsReveal && <RevealHeirs rules={rules} reload={reload} />}
      {!needsReveal && !hasHeirs && <InfoLine>This vault has no heirs, so there is nothing to pay out.</InfoLine>}

      {hasHeirs && view === 'checking' && <div className="skeleton sk-box" aria-busy="true" aria-label="Checking the release" />}

      {hasHeirs && isOwner && (view === 'ready' || view === 'failed') && (
        <InfoLine>
          The countdown has ended. {guardiansWord(rules.threshold)} must now press Release funds, so there is nothing for you to do.
          {needsConfirming && ` ${confirmedCount} of ${rules.threshold} have pressed it.`}
        </InfoLine>
      )}

      {hasHeirs && !isOwner && view === 'ready' && (
        <>
          <p className="lead-left">The countdown has ended. The vault's balance can now go to: {summary}.</p>
          {needsConfirming && (
            <p className="hint">
              {confirmedCount} of {rules.threshold} guardians have pressed Release funds. The payments go out when the last one does.
            </p>
          )}

          {!enoughConfirmed && !iConfirmed && (
            <ConfirmButton
              className="btn primary big"
              title="Release the funds"
              question={
                stillNeeded === 1
                  ? `You are the last guardian needed. Send the vault's balance to ${summary}? This cannot be undone.`
                  : `Agree to send the vault's balance to ${summary}? ${guardiansWord(stillNeeded - 1)} more must also press Release funds before anything is sent.`
              }
              confirmLabel="Yes, release"
              onConfirm={() => void confirmAndMaybeRun()}
            >
              <Icon name="send" />
              Release funds
            </ConfirmButton>
          )}

          {!enoughConfirmed && iConfirmed && (
            <InfoLine>
              You have pressed Release funds. Waiting for {guardiansWord(stillNeeded)} more to press it.
            </InfoLine>
          )}

          {/* Enough guardians agreed but the payments have not gone out, for example if a page was closed. Any guardian can finish. */}
          {enoughConfirmed && (
            <ConfirmButton
              className="btn primary big"
              title="Release the funds"
              question={`Send the vault's balance to ${summary}? This cannot be undone.`}
              confirmLabel="Yes, release"
              onConfirm={() => void run(status)}
            >
              <Icon name="send" />
              Release funds
            </ConfirmButton>
          )}
        </>
      )}

      {hasHeirs && view === 'running' && <InfoLine>{progress || 'Starting the release…'} Please keep this page open.</InfoLine>}
      {view === 'done' && <SuccessLine message="The release is complete. Every heir has been paid." />}
      {view === 'done' && isOwner && <p className="hint">To use this vault again, go to Settings and press Start again.</p>}

      {paid.map((p) => (
        <p className="hint" key={p.hash}>
          Paid {p.who}.{' '}
          <a href={explorerTx(p.hash)} target="_blank" rel="noreferrer">
            See it on Etherscan
          </a>
        </p>
      ))}

      {error && <ErrorLine message={error} />}

      {view === 'failed' && !isOwner && (
        <>
          <ErrorLine message="A payment failed, so the money is still in the vault." />
          <ConfirmButton
            className="btn primary big"
            title="Release again"
            question="Run the release again with the vault's current balance? With several heirs, check first who has already been paid."
            confirmLabel="Yes, release again"
            onConfirm={() => void retry()}
          >
            <Icon name="send" />
            Release again
          </ConfirmButton>
        </>
      )}
    </section>
  )
}
