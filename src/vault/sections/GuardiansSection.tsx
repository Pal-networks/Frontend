import { useState } from 'react'
import { ErrorLine, Reason, SuccessLine } from '../../components/Messages'
import { sendVaultCall } from '../../near/vaultApi'
import { EditGuardiansModal } from '../edit/EditGuardiansModal'
import { useAction } from '../hooks'
import { RELEASE_UNDER_WAY, type VaultContext } from '../types'

export function GuardiansSection({ rules, status, reload, isOwner }: VaultContext) {
  const [editing, setEditing] = useState(false)
  const { busy, error, message, run } = useAction(reload)
  const locked = RELEASE_UNDER_WAY.includes(status.phase)
  return (
    <section className="card">
      <div className="row">
        <h2>Guardians</h2>
        {isOwner && (
          <button className="btn small" disabled={locked} onClick={() => setEditing(true)}>
            {rules.guardians.length === 0 ? 'Add guardians' : 'Edit guardians'}
          </button>
        )}
      </div>
      {rules.guardians.length > 0 && (
        <p className="hint">
          {rules.threshold} of {rules.guardians.length} must agree to start a release.
        </p>
      )}
      {isOwner && locked && <Reason>Guardians cannot be changed while a release is under way. Cancel it first.</Reason>}

      {rules.guardian_invites.length === 0 ? (
        <p className="hint">None yet.</p>
      ) : (
        <ul className="plain-rows">
          {rules.guardian_invites.map((g) => (
            <li key={g.account}>
              <span className="break">{g.account}</span>
              <span className="row-right">
                <span className={`badge ${g.state}`}>{g.state}</span>
                {isOwner && g.state === 'expired' && (
                  <button
                    className="btn small"
                    disabled={!!busy}
                    onClick={() =>
                      run('reinvite', () => sendVaultCall('reinvite_guardian', { vault_id: rules.vault_id, guardian: g.account, new_guardian: null }), 'Invitation sent again.')
                    }
                  >
                    Invite again
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {message && <SuccessLine message={message} />}
      {error && <ErrorLine message={error} />}

      {editing && <EditGuardiansModal rules={rules} onSaved={reload} onClose={() => setEditing(false)} />}
    </section>
  )
}
