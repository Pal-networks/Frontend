import { useAuth } from '../auth/context'
import { Icon } from '../components/Icon'
import { ErrorLine } from '../components/Messages'
import { Shell } from '../components/Shell'

/** Logged in, while the person's NEAR account is being created. */
export function AccountSetupPage() {
  const auth = useAuth()
  return (
    <Shell>
      <section className="card">
        <div>
          <h1>Almost there</h1>
          <p className="lead">Signed in as {auth.email ?? 'your account'}.</p>
        </div>
        {auth.error && <ErrorLine message={auth.error} />}
        <div className="stack">
          {auth.busy ? (
            <div className="stack" aria-busy="true" aria-label="Setting up your NEAR account">
              <div className="skeleton sk-button" />
              <div className="skeleton sk-line center-line" style={{ width: '60%' }} />
            </div>
          ) : (
            <button className="btn primary" onClick={auth.retryNearWallet}>
              <Icon name="refresh" />
              Set up my NEAR account
            </button>
          )}
          <button className="btn" onClick={auth.logOut}>
            <Icon name="logout" />
            Sign out
          </button>
        </div>
      </section>
    </Shell>
  )
}
