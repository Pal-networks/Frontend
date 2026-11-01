import { Icon } from '../../components/Icon'
import { describe, formatSpan, type WizardState } from '../logic'

export function StepReview({ state }: { state: WizardState }) {
  const heirs = state.heirs.length
  const guardians = state.guardians.filter((g) => g.trim()).length
  return (
    <>
      <div>
        <h2>Review and create</h2>
        <p className="lead-left">Check everything. The vault is created as soon as you press the button below.</p>
      </div>

      <p className="summary">{describe(state)}</p>

      <dl className="facts">
        <div>
          <dt>Name</dt>
          <dd>{state.name.trim()}</dd>
        </div>
        <div>
          <dt>Heirs</dt>
          <dd>{heirs === 0 ? 'None yet' : `${heirs}${state.hideHeirs ? ' (hidden)' : ''}`}</dd>
        </div>
        <div>
          <dt>Guardians</dt>
          <dd>{guardians === 0 ? 'None yet' : `${guardians}, ${state.threshold} must agree`}</dd>
        </div>
        <div>
          <dt>Check-in every</dt>
          <dd>{formatSpan(state.checkIn)}</dd>
        </div>
        <div>
          <dt>Silence period</dt>
          <dd>{formatSpan(state.silence)}</dd>
        </div>
        <div>
          <dt>Waiting period</dt>
          <dd>{formatSpan(state.waiting)}</dd>
        </div>
      </dl>

      {(heirs === 0 || guardians === 0) && (
        <p className="note">
          <Icon name="info" />
          <span>Nothing can be released until the vault has at least one guardian and one heir. You can add them later.</span>
        </p>
      )}
      <p className="note">
        <Icon name="info" />
        <span>Creating the vault costs a small fee in test NEAR (about 0.1, and what is not needed comes back).</span>
      </p>
    </>
  )
}
