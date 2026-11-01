import { useState } from 'react'
import { ErrorLine, SuccessLine } from '../../components/Messages'
import { EDIT_DEPOSIT_YOCTO, sendVaultCall } from '../../near/vaultApi'
import { useAction } from '../hooks'
import type { VaultContext } from '../types'
import { RestartCard } from './RestartCard'

export function SettingsSection({ rules, status, reload }: VaultContext) {
  const { busy, error, message, run } = useAction(reload)
  const [name, setName] = useState(rules.name)
  return (
    <>
    <section className="card">
      <h2>Settings</h2>
      <div className="field">
        <span className="label">Vault name</span>
        <div className="row">
          <input className="input" value={name} maxLength={64} onChange={(e) => setName(e.target.value)} aria-label="Vault name" />
          <button
            className="btn small"
            disabled={!!busy || !name.trim() || name.trim() === rules.name}
            onClick={() =>
              run('rename', () => sendVaultCall('rename_vault', { vault_id: rules.vault_id, name: name.trim() }, { depositYocto: EDIT_DEPOSIT_YOCTO }), 'Name saved.')
            }
          >
            Save
          </button>
        </div>
      </div>
      {message && <SuccessLine message={message} />}
      {error && <ErrorLine message={error} />}
    </section>
    {status.execution_started && <RestartCard rules={rules} status={status} reload={reload} />}
    </>
  )
}
