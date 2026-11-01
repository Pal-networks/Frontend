import { useAuth } from '../auth/context'
import { Icon } from '../components/Icon'
import { ErrorLine } from '../components/Messages'
import { Shell } from '../components/Shell'
import { HowSection, LandingFooter, ProblemSection, ReasonsSection } from './landing/LandingSections'
import { SkyHero } from './landing/SkyHero'

/** The landing page, for anyone not signed in. `note` explains a vault link they followed. */
export function WelcomePage({ note }: { note?: string }) {
  const auth = useAuth()
  const signIn = (
    <button className="btn primary landing-btn" onClick={auth.logIn}>
      <Icon name="mail" />
      Continue with email or Google
    </button>
  )

  return (
    <Shell
      landing
      action={
        <button className="btn small" onClick={auth.logIn}>
          Sign in
        </button>
      }
    >
      <SkyHero>
        <h1 id="landing-title">What you own should reach the people you love</h1>
        <p className="sky-lead">Pal keeps your crypto in your control while you are here. If you go silent, people you trust can release it to the heirs you chose.</p>
        {note && <p className="sky-note">{note}</p>}
        {auth.error && <ErrorLine message={auth.error} />}
        <div className="sky-actions">
          {signIn}
          <button className="btn landing-btn" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
            See how it works
          </button>
        </div>
        <p className="sky-small">A test version. No real money is involved.</p>
      </SkyHero>

      <ProblemSection />
      <HowSection />
      <ReasonsSection />

      <section className="landing-cta">
        <h2>Set up your first vault</h2>
        <p>It takes a few minutes, and you can add heirs and guardians later.</p>
        {signIn}
      </section>

      <LandingFooter />
    </Shell>
  )
}
