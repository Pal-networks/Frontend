import { Icon } from '../../components/Icon'
import { MAX_HEIRS, newHeir, totalBps, type HeirDraft, type Patch, type WizardState } from '../logic'

/** `compact` hides the heading, for use inside a modal that has its own title. */
export function StepHeirs({ state, patch, compact = false }: { state: WizardState; patch: Patch; compact?: boolean }) {
  const total = totalBps(state.heirs) / 100
  const update = (id: string, p: Partial<HeirDraft>) =>
    patch({ heirs: state.heirs.map((h) => (h.id === id ? { ...h, ...p } : h)) })

  return (
    <>
      {!compact && (
      <div>
        <h2>Add heirs</h2>
        <p className="lead-left">
          Heirs receive their share when a release happens. They use a normal Ethereum address, and they do not need an
          account here. You can skip this and add heirs later.
        </p>
      </div>
      )}

      <label className="check">
        <input type="checkbox" checked={state.hideHeirs} onChange={(e) => patch({ hideHeirs: e.target.checked })} />
        <span>
          <Icon name="visibility_off" /> Keep heirs hidden until a release starts
        </span>
      </label>
      <p className="note">
        <Icon name="info" />
        <span>
          {state.hideHeirs
            ? 'Heirs will not be listed on the blockchain. After you create the vault you get a secret code for each heir. Keep these codes safe: if one is lost, that heir cannot be revealed. Names stay only on this screen and are not saved.'
            : 'Heirs and their names will be public on the blockchain, so anyone can read them. Choose hidden heirs if you want them private.'}
        </span>
      </p>

      <div className="stack">
        {state.heirs.map((h, i) => (
          <div className="heir-row" key={h.id}>
            <label className="field">
              <span className="label">Name {i === 0 ? '(optional)' : ''}</span>
              <input className="input" value={h.name} placeholder="Anna" onChange={(e) => update(h.id, { name: e.target.value })} />
            </label>
            <label className="field">
              <span className="label">Ethereum address</span>
              <input
                className="input mono-input"
                value={h.address}
                placeholder="0x…"
                spellCheck={false}
                onChange={(e) => update(h.id, { address: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="label">Share %</span>
              <input
                className="input"
                inputMode="decimal"
                value={h.percent}
                placeholder="50"
                onChange={(e) => update(h.id, { percent: e.target.value })}
              />
            </label>
            <button className="icon-btn" aria-label={`Remove heir ${i + 1}`} onClick={() => patch({ heirs: state.heirs.filter((x) => x.id !== h.id) })}>
              <Icon name="delete" />
            </button>
          </div>
        ))}
      </div>

      <div className="row">
        <button className="btn small" disabled={state.heirs.length >= MAX_HEIRS} onClick={() => patch({ heirs: [...state.heirs, newHeir()] })}>
          <Icon name="add" />
          Add heir
        </button>
        {state.heirs.length > 0 && (
          <span className={total === 100 ? 'total ok' : 'total bad'}>Total: {total}% of 100%</span>
        )}
      </div>
    </>
  )
}
