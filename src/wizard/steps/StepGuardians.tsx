import { Icon } from '../../components/Icon'
import { MAX_GUARDIANS, type Patch, type WizardState } from '../logic'

/** `compact` hides the heading, for use inside a modal that has its own title. */
export function StepGuardians({ state, patch, onSet, compact = false }: { state: WizardState; patch: Patch; onSet: (g: string[]) => void; compact?: boolean }) {
  const n = state.guardians.length
  return (
    <>
      {!compact && (
      <div>
        <h2>Choose guardians</h2>
        <p className="lead-left">
          Guardians are people you trust. If you go silent, enough of them agreeing starts a countdown. They decide{' '}
          <em>when</em>, never <em>who</em> gets the money. You can skip this and add guardians later.
        </p>
      </div>
      )}

      <div className="stack">
        {state.guardians.map((g, i) => (
          <div className="guardian-row" key={i}>
            <input
              className="input mono-input"
              value={g}
              placeholder="their NEAR account"
              spellCheck={false}
              aria-label={`Guardian ${i + 1} NEAR account`}
              onChange={(e) => onSet(state.guardians.map((x, j) => (j === i ? e.target.value.trim().toLowerCase() : x)))}
            />
            <button className="icon-btn" aria-label={`Remove guardian ${i + 1}`} onClick={() => onSet(state.guardians.filter((_, j) => j !== i))}>
              <Icon name="delete" />
            </button>
          </div>
        ))}
      </div>

      <div className="row">
        <button className="btn small" disabled={n >= MAX_GUARDIANS} onClick={() => onSet([...state.guardians, ''])}>
          <Icon name="add" />
          Add guardian
        </button>
        {n >= 2 && (
          <label className="inline-field">
            <span className="label">Must agree</span>
            <select className="select" value={state.threshold} onChange={(e) => patch({ threshold: Number(e.target.value) })}>
              {Array.from({ length: n }, (_, k) => k + 1).map((k) => (
                <option key={k} value={k}>
                  {k} of {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="note">
        <Icon name="info" />
        <span>
          For now, add guardians by their NEAR account. A guardian signs in to Pal and copies their account from the
          account menu at the top. Email invitations come later. Heirs should not also be guardians.
        </span>
      </p>
    </>
  )
}
