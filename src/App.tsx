import { useEffect } from 'react'
import { useAuth } from './auth/context'
import { missingSettings } from './config'
import { AccountSetupPage } from './pages/AccountSetupPage'
import { LoadingPage } from './pages/LoadingPage'
import { SetupProblemPage } from './pages/SetupProblemPage'
import { VaultsPage } from './pages/VaultsPage'
import { WelcomePage } from './pages/WelcomePage'
import { forgetVaultLink, rememberVaultLink, replacePath, savedVaultLink, usePath, vaultRoute } from './router'
import { VaultPage } from './vault/VaultPage'

/** Chooses the page to show. */
export default function App() {
  const missing = missingSettings()
  const auth = useAuth()
  const path = usePath()
  const route = vaultRoute(path)
  const signedOut = auth.ready && !auth.loggedIn

  // A signed-out address is always plain "/". A vault link is kept for after sign-in.
  useEffect(() => {
    if (!signedOut) return
    if (route) rememberVaultLink(path)
    if (path !== '/' || window.location.hash) replacePath('/')
  }, [signedOut, route, path])

  // Back to the vault link they followed, once they have signed in.
  useEffect(() => {
    if (!auth.accountId) return
    const link = savedVaultLink()
    if (!link) return
    forgetVaultLink()
    replacePath(link)
  }, [auth.accountId])

  if (missing.length) return <SetupProblemPage missing={missing} />
  if (route) return <VaultPage vaultId={route.vaultId} section={route.section} />
  if (!auth.ready) return <LoadingPage />
  if (!auth.loggedIn) return <WelcomePage note={savedVaultLink() ? 'Sign in to see this vault if you have been added to it.' : undefined} />
  if (!auth.accountId) return <AccountSetupPage />
  return <VaultsPage accountId={auth.accountId} />
}
