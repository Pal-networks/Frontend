import { DEMO_TIMERS, REAL_TIMERS, UNITS, type Patch, type Span, type Unit, type WizardState } from '../logic'

function SpanInput({ label, hint, value, onChange }: { label: string; hint: string; value: Span; onChange: (s: Span) => void }) {
  return (
    <div className="timer-row">
      <div>
        <span className="label">{label}</span>
        <p className="hint">{hint}</p>
      </div>
      <div className="timer-inputs">
        <input
          className="input"
          type="number"
          min={1}
          step={1}
          value={Number.isFinite(value.amount) ? value.amount : ''}
          aria-label={`${label} amount`}
          onChange={(e) => onChange({ ...value, amount: e.target.value === '' ? NaN : Number(e.target.value) })}
        />
        <select className="select" value={value.unit} aria-label={`${label} unit`} onChange={(e) => onChange({ ...value, unit: e.target.value as Unit })}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function StepTimers({ state, patch }: { state: WizardState; patch: Patch }) {
  return (
    <>
      <div>
        <h2>Set the timers</h2>
        <p className="lead-left">Choose how long each stage lasts. A month counts as 30 days and a year as 365 days.</p>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={state.demo}
          onChange={(e) => patch({ demo: e.target.checked, ...(e.target.checked ? DEMO_TIMERS : REAL_TIMERS) })}
        />
        <span>Demo mode: use minutes, so you can watch the whole story in a few minutes</span>
      </label>

      <SpanInput label="Check-in interval" hint="How often you should check in." value={state.checkIn} onChange={(checkIn) => patch({ checkIn, demo: false })} />
      <SpanInput label="Silence period" hint="How long you can stay silent before guardians may act." value={state.silence} onChange={(silence) => patch({ silence, demo: false })} />
      <SpanInput label="Waiting period" hint="The countdown after guardians agree. You can cancel until it ends." value={state.waiting} onChange={(waiting) => patch({ waiting, demo: false })} />
    </>
  )
}
