import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Reason } from '../../components/Messages'
import { EditHeirsModal } from '../edit/EditHeirsModal'
import { shortEth } from '../text'
import { RELEASE_UNDER_WAY, type VaultContext } from '../types'

export function HeirsSection({ rules, status, reload, isOwner }: VaultContext) {
  const [editing, setEditing] = useState(false)
  const locked = RELEASE_UNDER_WAY.includes(status.phase)
  const none = rules.heirs.length === 0 && !rules.heirs_hidden
  return (
    <section className="card">
      <div className="row">
        <h2>Heirs</h2>
        {isOwner && (
          <button className="btn small" disabled={locked} onClick={() => setEditing(true)}>
            {none ? 'Add heirs' : 'Edit heirs'}
          </button>
        )}
      </div>
      {isOwner && locked && <Reason>Heirs cannot be changed while a release is under way. Cancel it first.</Reason>}

      {rules.heirs_hidden && rules.heirs.length === 0 ? (
        <p className="hint">
          <Icon name="visibility_off" /> {rules.heir_commitments.length} hidden heir{rules.heir_commitments.length === 1 ? '' : 's'}. They are revealed only when a release starts.
        </p>
      ) : rules.heirs.length === 0 ? (
        <p className="hint">None yet.</p>
      ) : (
        <ul className="plain-rows">
          {rules.heirs.map((h) => (
            <li key={h.eth_address}>
              <span className="break">
                {h.label ? `${h.label} · ` : ''}
                <span title={h.eth_address}>{shortEth(h.eth_address)}</span>
              </span>
              <span className="badge">{h.bps / 100}%</span>
            </li>
          ))}
        </ul>
      )}

      {editing && <EditHeirsModal rules={rules} onSaved={reload} onClose={() => setEditing(false)} />}
    </section>
  )
}
