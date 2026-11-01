import { useEffect, useState } from 'react'
import { friendlyError } from '../auth/errors'
import { Icon } from '../components/Icon'
import { ErrorLine } from '../components/Messages'
import { Shell } from '../components/Shell'
import { getVaultsByOwner, getVaultsForGuardian, type VaultSummary } from '../near/vault'
import { navigate } from '../router'
import { Wizard } from '../wizard/Wizard'

interface Lists {
  owned: VaultSummary[]
  guarded: VaultSummary[]
}

/** Loads the vaults this account belongs to. `null` means still loading. Change `reload` to load again. */
function useVaults(accountId: string, reload: number) {
  const [state, setState] = useState<{ lists: Lists | null; error: string | null }>({ lists: null, error: null })
  useEffect(() => {
    let cancelled = false
    Promise.all([getVaultsByOwner(accountId), getVaultsForGuardian(accountId)])
      .then(([owned, guarded]) => !cancelled && setState({ lists: { owned, guarded }, error: null }))
      .catch((e) => !cancelled && setState({ lists: { owned: [], guarded: [] }, error: `Could not load your vaults. ${friendlyError(e)}` }))
    return () => {
      cancelled = true
    }
  }, [accountId, reload])
  return state
}

function VaultList({ vaults }: { vaults: VaultSummary[] }) {
  return (
    <ul className="vault-list">
      {vaults.map((v) => (
        <li key={v.vault_id}>
          <a
            className="vault-row"
            href={`/vault/${v.vault_id}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/vault/${v.vault_id}`)
            }}
          >
            <span>{v.name}</span>
            <span className="badge">Vault {v.vault_id}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** The main screen once signed in: only the vaults this person belongs to, or the "new vault" wizard. */
export function VaultsPage({ accountId }: { accountId: string }) {
  const [creating, setCreating] = useState(false)
  const [reload, setReload] = useState(0)
  const { lists, error } = useVaults(accountId, reload)

  return (
    <Shell wide>
      {creating ? (
        <Wizard
          accountId={accountId}
          onExit={() => {
            setCreating(false)
            setReload((n) => n + 1) // show the new vault in the list
          }}
        />
      ) : (
        <div className="stack-lg">
          <div className="section-head">
            <h1>Your vaults</h1>
            <button className="btn primary small" onClick={() => setCreating(true)}>
              <Icon name="add" />
              New vault
            </button>
          </div>

          {error && <ErrorLine message={error} />}

          {lists === null && (
            <div className="stack" aria-busy="true" aria-label="Loading your vaults">
              <div className="skeleton vault-skeleton" />
              <div className="skeleton vault-skeleton" />
            </div>
          )}

          {lists && lists.owned.length === 0 && !error && (
            <section className="card empty">
              <h2>You have no vaults yet</h2>
              <p className="lead">A vault holds your instructions: who receives what, and when. You can add guardians and heirs now or later.</p>
            </section>
          )}

          {lists && lists.owned.length > 0 && <VaultList vaults={lists.owned} />}

          {lists && lists.guarded.length > 0 && (
            <>
              <h2 className="list-title">Vaults you guard</h2>
              <VaultList vaults={lists.guarded} />
            </>
          )}
        </div>
      )}
    </Shell>
  )
}
