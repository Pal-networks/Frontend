import { InfoLine } from '../../components/Messages'
import type { Rules, Status } from '../../near/vaultApi'
import { useNow } from '../hooks'
import { formatCountdown, formatNs, PHASE_TEXT } from '../text'

/** Where the vault is right now, in plain words, with the relevant time. */
export function StatusCard({ rules, status }: { rules: Rules; status: Status }) {
  const now = useNow()
  const text = PHASE_TEXT[status.phase]
  const execMs = status.executable_at_ns ? status.executable_at_ns / 1e6 : null
  const dueMs = status.next_check_in_due_ns / 1e6
  const silenceMs = status.silence_ends_ns / 1e6
  return (
    <section className="card">
      <div className="row">
        <h2>{text.title}</h2>
        <span className="badge">{status.phase.replace(/_/g, ' ')}</span>
      </div>
      <p className="lead-left">{text.detail}</p>
      {!rules.setup_complete && <InfoLine>Nothing can be released yet. This vault needs at least one guardian and one heir.</InfoLine>}
      <dl className="facts">
        <div>
          <dt>Last check-in</dt>
          <dd>{formatNs(status.last_check_in_ns)}</dd>
        </div>
        {status.phase === 'alive' && (
          <div>
            <dt>{dueMs > now ? 'Next check-in due in' : 'Check-in overdue by'}</dt>
            <dd className="countdown" title={formatNs(status.next_check_in_due_ns)}>
              {formatCountdown(Math.abs(dueMs - now))}
            </dd>
          </div>
        )}
        {(status.phase === 'alive' || status.phase === 'inactive') && rules.setup_complete && (
          <div>
            <dt>Guardians may act in</dt>
            <dd className="countdown" title={formatNs(status.silence_ends_ns)}>
              {silenceMs > now ? formatCountdown(silenceMs - now) : 'Any moment now'}
            </dd>
          </div>
        )}
        {status.phase === 'countdown' && execMs && (
          <div>
            <dt>Countdown ends in</dt>
            <dd className="countdown" title={formatNs(status.executable_at_ns as number)}>
              {execMs > now ? formatCountdown(execMs - now) : 'Any moment now'}
            </dd>
          </div>
        )}
        {status.approvals.length > 0 && (
          <div>
            <dt>Guardians who approved</dt>
            <dd>
              {status.approvals.length} of {rules.threshold}
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
