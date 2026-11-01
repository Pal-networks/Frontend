import { useState } from 'react'
import { HeirCards } from '../../components/HeirCards'
import { ErrorLine, InfoLine } from '../../components/Messages'
import { Modal } from '../../components/Modal'
import { EDIT_DEPOSIT_YOCTO, sendVaultCall, type Rules } from '../../near/vaultApi'
import { buildCreateVaultArgs, newHeir, newState, validateHeirs, type HeirCard, type WizardState } from '../../wizard/logic'
import { StepHeirs } from '../../wizard/steps/StepHeirs'

/** Add, remove or change the heirs of an existing vault. */
export function EditHeirsModal({ rules, onSaved, onClose }: { rules: Rules; onSaved: () => Promise<void>; onClose: () => void }) {
  const [state, setState] = useState<WizardState>(() => {
    // Public heirs can be edited. Hidden heirs are only hashes on the blockchain, so they start empty.
    const existing = rules.heirs_hidden ? [] : rules.heirs.map((h) => ({ ...newHeir(), name: h.label, address: h.eth_address, percent: String(h.bps / 100) }))
    return { ...newState(), name: rules.name, hideHeirs: rules.heirs_hidden, heirs: existing.length ? existing : [newHeir()] }
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [cards, setCards] = useState<HeirCard[] | null>(null)

  const patch = (p: Partial<WizardState>) => (setState((s) => ({ ...s, ...p })), setError(null))

  const save = async () => {
    const msg = validateHeirs(state)
    if (msg) return setError(msg)
    setSaving(true)
    try {
      const { args, cards: made } = await buildCreateVaultArgs(state)
      await sendVaultCall(
        'set_heirs',
        { vault_id: rules.vault_id, public_heirs: args.public_heirs, heir_commitments: args.heir_commitments },
        { depositYocto: EDIT_DEPOSIT_YOCTO },
      )
      await onSaved()
      if (made.length > 0) setCards(made) // show the new secret codes before closing
      else onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // The codes exist only here, so the modal cannot be closed by accident.
  if (cards) {
    return (
      <Modal title="Save the secret codes" onClose={onClose} locked wide>
        <HeirCards cards={cards} vaultId={rules.vault_id} name={rules.name} />
        <button className="btn primary" onClick={onClose}>
          I have saved them
        </button>
      </Modal>
    )
  }

  return (
    <Modal title={rules.heirs.length || rules.heirs_hidden ? 'Edit heirs' : 'Add heirs'} onClose={onClose} locked={saving} wide>
      <StepHeirs state={state} patch={patch} compact />
      {rules.heirs_hidden && <InfoLine>Hidden heirs cannot be read back. Saving replaces all of them, so enter every heir again and keep the new secret codes.</InfoLine>}
      {error && <ErrorLine message={error} />}
      <div className="wizard-nav">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save heirs'}
        </button>
      </div>
    </Modal>
  )
}
