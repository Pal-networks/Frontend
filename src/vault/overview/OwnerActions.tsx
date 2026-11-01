import { ConfirmButton } from '../../components/ConfirmButton'
import { Icon } from '../../components/Icon'
import { ErrorLine, Reason, SuccessLine } from '../../components/Messages'
import { sendVaultCall } from '../../near/vaultApi'
import { useAction } from '../hooks'
import type { VaultContext } from '../types'

/** Check in, and cancel a release. */
export function OwnerActions({ rules, status, reload }: VaultContext) {
  const { busy, error, message, run } = useAction(reload)
  const finished = status.phase === 'executable'
  const vault_id = rules.vault_id
  return (
    <section className="card">
      <h2>You are the owner</h2>
      <div className="stack">
        <button
          className="btn primary big"
          disabled={!!busy || finished}
          onClick={() => run('checkin', () => sendVaultCall('check_in', { vault_id }), 'Checked in. The clock starts again.')}
        >
          <Icon name="check" />
          {busy === 'checkin' ? 'Checking in…' : 'Check in'}
        </button>
        {finished && <Reason>The countdown has ended, so you can no longer check in or cancel.</Reason>}
        {['pending_approval', 'countdown'].includes(status.phase) && (
          <ConfirmButton
            className="btn"
            disabled={!!busy}
            title="Cancel the release"
            question="Cancel this release? Guardians would have to approve again."
            confirmLabel="Yes, cancel it"
            onConfirm={() => run('cancel', () => sendVaultCall('cancel_release', { vault_id }), 'The release was cancelled.')}
          >
            <Icon name="close" />
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel the release'}
          </ConfirmButton>
        )}
      </div>
      {message && <SuccessLine message={message} />}
      {error && <ErrorLine message={error} />}
    </section>
  )
}
