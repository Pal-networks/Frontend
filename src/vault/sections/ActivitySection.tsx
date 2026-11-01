import { useCallback, useEffect, useState } from 'react'
import { friendlyError } from '../../auth/errors'
import { Icon } from '../../components/Icon'
import { ErrorLine } from '../../components/Messages'
import { config } from '../../config'
import { fetchVaultActivity, type ActivityItem } from '../../near/activity'
import type { Rules } from '../../near/vaultApi'
import { describeActivity, timeAgo } from '../activityText'
import { useNow } from '../hooks'
import { shortAccount } from '../text'

/** How many actions to show at a time. */
const PAGE = 6

/** Who did it, in words: "Owner", or the guardian's short account. */
function whoLabel(who: string, rules: Rules): string {
  if (who === rules.owner) return 'Owner'
  return rules.guardians.includes(who) ? `Guardian ${shortAccount(who)}` : shortAccount(who)
}

export function ActivitySection({ rules }: { rules: Rules }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const now = useNow(30000)
  const pages = items ? Math.ceil(items.length / PAGE) : 0
  const current = Math.min(page, Math.max(pages, 1))

  const load = useCallback(async () => {
    setError(null)
    try {
      setItems(await fetchVaultActivity(config.vaultAccount, rules.vault_id))
    } catch (e) {
      setError(`Could not load the activity. ${friendlyError(e)}`)
    }
  }, [rules.vault_id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="card">
      <div className="row">
        <h2>Activity</h2>
        <button
          className="btn small"
          disabled={items === null && !error}
          onClick={() => {
            setItems(null)
            void load()
          }}
        >
          <Icon name="refresh" />
          Refresh
        </button>
      </div>

      {error && <ErrorLine message={error} />}

      {items === null && !error && (
        <div className="stack" aria-busy="true" aria-label="Loading the activity">
          <div className="skeleton sk-box" />
          <div className="skeleton sk-box" />
          <div className="skeleton sk-box" />
        </div>
      )}

      {items?.length === 0 && <p className="hint">Nothing yet.</p>}

      {items && items.length > 0 && (
        <ul className="activity">
          {items.slice((current - 1) * PAGE, current * PAGE).map((a) => {
            const d = describeActivity(a)
            return (
              <li key={a.hash}>
                <span className="activity-icon">
                  <Icon name={d.icon} />
                </span>
                <span className="activity-text">
                  <span>{d.text}</span>
                  <span className="hint">{whoLabel(a.who, rules)}</span>
                </span>
                <a className="hint activity-time" href={`https://testnet.nearblocks.io/txns/${a.hash}`} target="_blank" rel="noreferrer" title={new Date(a.whenMs).toLocaleString()}>
                  {timeAgo(a.whenMs, now)}
                </a>
              </li>
            )
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Activity pages">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button key={n} className={n === current ? 'page-btn active' : 'page-btn'} aria-current={n === current ? 'page' : undefined} onClick={() => setPage(n)}>
              {n}
            </button>
          ))}
        </nav>
      )}
    </section>
  )
}
