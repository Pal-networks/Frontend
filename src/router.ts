import { useEffect, useState } from 'react'

/** Goes to another page of the app without reloading it. */
export function navigate(to: string) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/** Like navigate, but the Back button will not return to the address being replaced. */
export function replacePath(to: string) {
  window.history.replaceState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const VAULT_LINK_KEY = 'pal.vaultLink'

/** Keeps a vault link for after sign-in, so a signed-out address can stay clean. Lasts for this tab only. */
export function rememberVaultLink(path: string) {
  try {
    sessionStorage.setItem(VAULT_LINK_KEY, path)
  } catch {
    // Storage can be blocked. The person then lands on their vault list instead.
  }
}

export function savedVaultLink(): string | null {
  try {
    return sessionStorage.getItem(VAULT_LINK_KEY)
  } catch {
    return null
  }
}

export function forgetVaultLink() {
  try {
    sessionStorage.removeItem(VAULT_LINK_KEY)
  } catch {
    // Nothing was stored.
  }
}

/** The current address path, for example "/" or "/vault/2". Updates on navigation. */
export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return path
}

export type VaultSection = 'overview' | 'heirs' | 'guardians' | 'deposit' | 'activity' | 'settings'

/** "/vault/12/heirs" -> vault 12, section heirs. Anything else -> null. */
export function vaultRoute(path: string): { vaultId: number; section: VaultSection } | null {
  const m = path.match(/^\/vault\/(\d+)(?:\/(heirs|guardians|deposit|activity|settings))?\/?$/)
  return m ? { vaultId: Number(m[1]), section: (m[2] as VaultSection) ?? 'overview' } : null
}
