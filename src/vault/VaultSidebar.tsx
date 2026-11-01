import { Icon } from '../components/Icon'
import { navigate, type VaultSection } from '../router'

export interface SidebarItem {
  key: VaultSection
  label: string
  icon: string
}

export function VaultSidebar({ vaultId, name, items, current }: { vaultId: number; name: string; items: SidebarItem[]; current: VaultSection }) {
  const go = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    navigate(to)
  }
  return (
    <aside className="sidebar">
      <a className="back-link" href="/" onClick={go('/')}>
        <Icon name="arrow_back" /> Your vaults
      </a>
      <div className="side-title">
        <span className="break">{name}</span>
        <span className="hint">Vault {vaultId}</span>
      </div>
      <nav aria-label="Vault sections">
        <ul className="side-nav">
          {items.map((i) => {
            const href = i.key === 'overview' ? `/vault/${vaultId}` : `/vault/${vaultId}/${i.key}`
            return (
              <li key={i.key}>
                <a href={href} onClick={go(href)} className={i.key === current ? 'active' : ''} aria-current={i.key === current ? 'page' : undefined}>
                  <Icon name={i.icon} />
                  {i.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
