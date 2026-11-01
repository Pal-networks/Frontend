import { useState } from 'react'
import { ErrorLine } from '../../components/Messages'
import { Modal } from '../../components/Modal'
import { EDIT_DEPOSIT_YOCTO, sendVaultCall, type Rules } from '../../near/vaultApi'
import { newState, validateGuardians, type WizardState } from '../../wizard/logic'
import { StepGuardians } from '../../wizard/steps/StepGuardians'

/** Add, remove or change the guardians of an existing vault. */
export function EditGuardiansModal({ rules, onSaved, onClose }: { rules: Rules; onSaved: () => Promise<void>; onClose: () => void }) {
  const [state, setState] = useState<WizardState>(() => ({
    ...newState(),
    guardians: rules.guardians.length ? [...rules.guardians] : [''],
    threshold: rules.threshold || 2,
  }))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const patch = (p: Partial<WizardState>) => (setState((s) => ({ ...s, ...p })), setError(null))
  const setGuardians = (guardians: string[]) => {
    const n = guardians.length
    patch({ guardians, threshold: n === 0 ? 0 : Math.min(Math.max(state.threshold || 2, 1), n) })
  }

  const save = async () => {
    const msg = validateGuardians(state, rules.owner)
    if (msg) return setError(msg)
    setSaving(true)
    try {
      await sendVaultCall(
        'set_guardians',
        { vault_id: rules.vault_id, guardians: state.guardians.map((g) => g.trim()), threshold: state.guardians.length === 0 ? 0 : Math.min(state.threshold, state.guardians.length) },
        { depositYocto: EDIT_DEPOSIT_YOCTO },
      )
      await onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={rules.guardians.length ? 'Edit guardians' : 'Add guardians'} onClose={onClose} locked={saving} wide>
      <StepGuardians state={state} patch={patch} onSet={setGuardians} compact />
      <p className="hint">Guardians who stay keep their acceptance. New guardians get a fresh invitation.</p>
      {error && <ErrorLine message={error} />}
      <div className="wizard-nav">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save guardians'}
        </button>
      </div>
    </Modal>
  )
}
