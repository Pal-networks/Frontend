import { useState } from 'react'
import { friendlyError } from '../auth/errors'
import { Icon } from '../components/Icon'
import { createVault } from '../near/create'
import { Done } from './Done'
import {
  buildCreateVaultArgs,
  newState,
  validateGuardians,
  validateHeirs,
  validateName,
  validateTimers,
  type HeirCard,
  type WizardState,
} from './logic'
import { StepGuardians } from './steps/StepGuardians'
import { StepHeirs } from './steps/StepHeirs'
import { StepName } from './steps/StepName'
import { StepReview } from './steps/StepReview'
import { StepTimers } from './steps/StepTimers'

const STEP_NAMES = ['Name', 'Heirs', 'Guardians', 'Timers', 'Review']

/** Nothing is sent to the blockchain until the last step. */
export function Wizard({ accountId, onExit }: { accountId: string; onExit: () => void }) {
  const [state, setState] = useState<WizardState>(newState)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [done, setDone] = useState<{ vaultId: number; cards: HeirCard[]; name: string } | null>(null)

  const patch = (p: Partial<WizardState>) => {
    setState((s) => ({ ...s, ...p }))
    setError(null)
  }

  /** Keeps "how many must agree" sensible when guardians are added or removed. */
  const setGuardians = (guardians: string[]) => {
    const n = guardians.length
    const threshold = n === 0 ? 0 : Math.min(Math.max(state.threshold || 2, 1), n)
    patch({ guardians, threshold })
  }

  const check = (i: number): string | null =>
    i === 0 ? validateName(state) : i === 1 ? validateHeirs(state) : i === 2 ? validateGuardians(state, accountId) : i === 3 ? validateTimers(state) : null

  const next = () => {
    const msg = check(step)
    if (msg) return setError(msg)
    setStep(step + 1)
  }

  const activate = async () => {
    // Check every step again before anything is sent.
    for (let i = 0; i < 4; i++) {
      const msg = check(i)
      if (msg) {
        setStep(i)
        return setError(msg)
      }
    }
    setWorking(true)
    setError(null)
    try {
      const { args, cards } = await buildCreateVaultArgs(state)
      const vaultId = await createVault(accountId, args)
      setDone({ vaultId, cards, name: state.name.trim() })
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setWorking(false)
    }
  }

  if (done) return <Done vaultId={done.vaultId} name={done.name} cards={done.cards} onFinish={onExit} />

  const last = step === STEP_NAMES.length - 1
  // Heirs and guardians are optional: with an empty list, Next simply skips the step.
  const skipping = (step === 1 && state.heirs.length === 0) || (step === 2 && state.guardians.length === 0)

  return (
    <section className="card wide-card" aria-label="Create a vault">
      <ol className="stepper" aria-label="Progress">
        {STEP_NAMES.map((n, i) => (
          <li key={n} className={i === step ? 'current' : i < step ? 'past' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="dot">{i < step ? <Icon name="check" /> : i + 1}</span>
            <span className="step-name">{n}</span>
          </li>
        ))}
      </ol>

      {step === 0 && <StepName state={state} patch={patch} />}
      {step === 1 && <StepHeirs state={state} patch={patch} />}
      {step === 2 && <StepGuardians state={state} patch={patch} onSet={setGuardians} />}
      {step === 3 && <StepTimers state={state} patch={patch} />}
      {step === 4 && <StepReview state={state} />}

      {error && (
        <p className="alert" role="alert">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}

      {working && (
        <p className="note" aria-live="polite">
          <Icon name="info" />
          <span>Creating your vault. This takes a few seconds.</span>
        </p>
      )}

      <div className="wizard-nav">
        <button className="btn" disabled={working} onClick={step === 0 ? onExit : () => (setError(null), setStep(step - 1))}>
          <Icon name="arrow_back" />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {last ? (
          <button className="btn primary" disabled={working} onClick={activate}>
            {working ? 'Creating…' : 'Create vault'}
          </button>
        ) : (
          <button className="btn primary" disabled={working} onClick={next}>
            {skipping ? 'Skip for now' : 'Next'}
            <Icon name="arrow_forward" />
          </button>
        )}
      </div>
    </section>
  )
}
