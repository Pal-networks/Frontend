import { useEffect, useState } from 'react'
import { friendlyError } from '../../auth/errors'
import { ConfirmButton } from '../../components/ConfirmButton'
import { Icon } from '../../components/Icon'
import { ErrorLine, Reason } from '../../components/Messages'
import { getVaultEthAddress } from '../../near/deriveAddress'
import { sendVaultCall, type Rules, type Status } from '../../near/vaultApi'
import { useAction } from '../hooks'
import { releaseState } from '../release/runRelease'

/** Owner only, after a release: puts the vault back to normal once the heirs are paid. */
export function RestartCard({ rules, status, reload }: { rules: Rules; status: Status; reload: () => Promise<void> }) {
  const { busy, error, run } = useAction(reload)
  const [paid, setPaid] = useState<boolean | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getVaultEthAddress(rules.vault_id)
      .then((a) => releaseState(rules, status, a))
      .then((s) => !cancelled && setPaid(s.kind === 'done'))
      .catch((e) => !cancelled && setCheckError(friendlyError(e)))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules.vault_id, status.execution_base_nonce])

  return (
    <section className="card">
      <h2>Start again</h2>
      <p className="lead-left">Put this vault back to normal so you can check in again. Guardians, heirs and the deposit address stay the same.</p>
      {paid === null && !checkError && <div className="skeleton sk-button" aria-busy="true" aria-label="Checking the release" />}
      {paid !== null && (
        <ConfirmButton
          className="btn"
          disabled={!paid || !!busy}
          title="Start again"
          question="Put this vault back to normal so you can check in again?"
          confirmLabel="Yes, start again"
          onConfirm={() => run('restart', () => sendVaultCall('restart_vault', { vault_id: rules.vault_id }))}
        >
          <Icon name="refresh" />
          {busy ? 'Starting again…' : 'Start again'}
        </ConfirmButton>
      )}
      {paid === false && <Reason>This is available once the heirs have been paid.</Reason>}
      {checkError && <ErrorLine message={checkError} />}
      {error && <ErrorLine message={error} />}
    </section>
  )
}
