import type { Patch, WizardState } from '../logic'

export function StepName({ state, patch }: { state: WizardState; patch: Patch }) {
  return (
    <>
      <div>
        <h2>Name your vault</h2>
        <p className="lead-left">This is just a label for you, for example "My Family" or "Workplace". You can change it any time.</p>
      </div>
      <label className="field">
        <span className="label">Vault name</span>
        <input
          className="input"
          value={state.name}
          maxLength={64}
          placeholder="My Family"
          autoFocus
          onChange={(e) => patch({ name: e.target.value })}
        />
      </label>
    </>
  )
}
