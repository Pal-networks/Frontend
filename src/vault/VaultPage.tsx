import { useAuth } from '../auth/context'
import { Icon } from '../components/Icon'
import { ErrorLine } from '../components/Messages'
import { Shell } from '../components/Shell'
import { navigate, type VaultSection } from '../router'
import { useVault } from './hooks'
import { ActivitySection } from './sections/ActivitySection'
import { DepositSection } from './sections/DepositSection'
import { GuardiansSection } from './sections/GuardiansSection'
import { HeirsSection } from './sections/HeirsSection'
import { OverviewSection } from './sections/OverviewSection'
import { SettingsSection } from './sections/SettingsSection'
import { VaultSidebar, type SidebarItem } from './VaultSidebar'
import { VaultSkeleton } from './VaultSkeleton'

function GateCard({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <Shell>
      <section className="card">
        <div>
          <h1>{title}</h1>
          <p className="lead">{text}</p>
        </div>
        {children}
      </section>
    </Shell>
  )
}

/** One vault: a sidebar of sections. Shown only to its owner and its guardians. */
export function VaultPage({ vaultId, section }: { vaultId: number; section: VaultSection }) {
  const auth = useAuth()
  const { rules, status, error, loading, reload } = useVault(vaultId)
  const me = auth.accountId
  const isOwner = !!me && !!rules && me === rules.owner
  const isMember = isOwner || (!!me && !!rules && rules.guardians.includes(me))

  // A signed-out visitor is moved to the landing page by App.
  if (!auth.ready || !auth.loggedIn) return <VaultSkeleton />
  if (!me || loading) return <VaultSkeleton />
  // A failed read is not the same as "you are not a member".
  if (!rules && error && error !== 'This vault does not exist.') {
    return <GateCard title="Could not load this vault" text={error} />
  }
  // The same answer whether the vault does not exist or the person is not in it.
  if (!isMember || !rules || !status) {
    return (
      <GateCard title="Vault not available" text="You have not been added to this vault.">
        <button className="btn" onClick={() => navigate('/')}>
          <Icon name="arrow_back" />
          Your vaults
        </button>
      </GateCard>
    )
  }

  const items: SidebarItem[] = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'heirs', label: 'Heirs', icon: 'group' },
    { key: 'guardians', label: 'Guardians', icon: 'shield' },
    { key: 'deposit', label: 'Deposit', icon: 'account_balance_wallet' },
    { key: 'activity', label: 'Activity', icon: 'history' },
    ...(isOwner ? [{ key: 'settings' as const, label: 'Settings', icon: 'settings' }] : []),
  ]
  // A section that is not available right now falls back to the overview.
  const shown = items.some((i) => i.key === section) ? section : 'overview'
  const ctx = { rules, status, reload, isOwner }

  return (
    <Shell bare>
      <VaultSidebar vaultId={vaultId} name={rules.name} items={items} current={shown} />
      <div className="content stack-lg">
        {error && <ErrorLine message={error} />}
        {shown === 'overview' && <OverviewSection {...ctx} accountId={me} />}
        {shown === 'heirs' && <HeirsSection {...ctx} />}
        {shown === 'guardians' && <GuardiansSection {...ctx} />}
        {shown === 'deposit' && <DepositSection rules={rules} />}
        {shown === 'activity' && <ActivitySection rules={rules} />}
        {shown === 'settings' && <SettingsSection {...ctx} />}
      </div>
    </Shell>
  )
}
