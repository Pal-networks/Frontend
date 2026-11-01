import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/context'
import { AccountMenu } from './AccountMenu'
import { HelpMenu } from './HelpMenu'

/** True once the page has moved down from the very top. */
function useScrolled(enabled: boolean) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (!enabled) return
    const update = () => setScrolled(window.scrollY > 8)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [enabled])
  return scrolled
}

/** `overSky` lets the landing page's sky show behind the header until the page scrolls. */
function Topbar({ action, overSky = false }: { action?: ReactNode; overSky?: boolean }) {
  const scrolled = useScrolled(overSky)
  return (
    <header className={`topbar${overSky ? ' over-sky' : ''}${scrolled ? ' scrolled' : ''}`}>
      <div className="logo" aria-hidden="true">
        P
      </div>
      <span className="brand">Pal</span>
      <span className="badge">Testnet</span>
      <span className="spacer" />
      <HelpMenu />
      <AccountMenu />
      {action}
    </header>
  )
}

/** Development only: the last few events, so a stuck screen can be diagnosed. */
function DebugStrip() {
  const { debug } = useAuth()
  if (!import.meta.env.DEV || debug.length === 0) return null
  return (
    <details className="debug">
      <summary>Developer log</summary>
      <pre>{debug.join('\n')}</pre>
    </details>
  )
}

/**
 * The page frame: header on top, content below. `bare` leaves the layout to the
 * page (the vault sidebar), `landing` gives it the full width, and `action` adds
 * something to the header.
 */
export function Shell({ children, wide = false, bare = false, landing = false, action }: { children: ReactNode; wide?: boolean; bare?: boolean; landing?: boolean; action?: ReactNode }) {
  return (
    <div className="page">
      <Topbar action={action} overSky={landing} />
      <main className={landing ? 'landing' : bare ? 'with-sidebar' : wide ? 'content' : 'center'}>{children}</main>
      <DebugStrip />
    </div>
  )
}
