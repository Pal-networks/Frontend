import { ConfirmButton } from '../../components/ConfirmButton'
import { Icon } from '../../components/Icon'
import { ErrorLine, Reason, SuccessLine } from '../../components/Messages'
import { sendVaultCall } from '../../near/vaultApi'
import { useAction } from '../hooks'
import type { VaultContext } from '../types'

/** Accept the invitation, and approve a release. Shows nothing to anyone who is not a guardian. */
export function GuardianActions({ rules, status, reload, accountId }: VaultContext & { accountId: string }) {
  const { busy, error, message, run } = useAction(reload)
  const invite = rules.guardian_invites.find((i) => i.account === accountId)
  if (!invite) return null
  const vault_id = rules.vault_id
  const alreadyApproved = status.approvals.includes(accountId)
  const canApprove = invite.state === 'accepted' && ['guardians_may_act', 'pending_approval'].includes(status.phase) && !alreadyApproved

  let reason: string | null = null
  if (invite.state === 'expired') reason = 'Your invitation has expired. Ask the owner to invite you again.'
  else if (alreadyApproved) reason = 'You have already approved this release.'
  else if (status.phase === 'inactive') reason = 'Other guardians have not accepted yet.'
  else if (status.phase === 'alive') reason = 'The owner has not been silent long enough yet.'
  else if (status.phase === 'countdown') reason = 'Enough guardians have already agreed. The countdown is running.'
  else if (status.phase === 'executable') reason = 'The countdown has ended.'

  return (
    <section className="card">
      <h2>You are a guardian</h2>
      <p className="lead-left">
        You help decide <em>when</em> this vault is released. You can never change who receives anything.
      </p>
      <div className="stack">
        {invite.state === 'invited' && (
          <button
            className="btn primary big"
            disabled={!!busy}
            onClick={() => run('accept', () => sendVaultCall('accept_guardianship', { vault_id }), 'You accepted. Thank you.')}
          >
            <Icon name="check" />
            {busy === 'accept' ? 'Accepting…' : 'Accept guardianship'}
          </button>
        )}
        {invite.state === 'accepted' && (
          <ConfirmButton
            className="btn primary big"
            disabled={!canApprove || !!busy}
            title="Approve the release"
            question={`Approve the release of "${rules.name}"? Do this only if you believe the owner can no longer check in.`}
            confirmLabel="Yes, approve"
            onConfirm={() => run('approve', () => sendVaultCall('approve_release', { vault_id }), 'Your approval was recorded.')}
          >
            {busy === 'approve' ? 'Approving…' : 'Approve release'}
          </ConfirmButton>
        )}
        {invite.state !== 'invited' && !canApprove && reason && <Reason>{reason}</Reason>}
      </div>
      {message && <SuccessLine message={message} />}
      {error && <ErrorLine message={error} />}
    </section>
  )
}
