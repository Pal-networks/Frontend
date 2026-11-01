import { Icon } from '../../components/Icon'

const STEPS = [
  { title: 'Create a vault', text: 'Name it, choose your heirs and their shares, and add guardians you trust.' },
  { title: 'Add funds and check in', text: 'The vault has its own Ethereum address. Check in now and then, and nothing changes.' },
  { title: 'If you go silent', text: 'After the time you set, guardians can approve a release. A countdown then starts, and you can still cancel.' },
  { title: 'Your heirs receive', text: 'When the countdown ends, a guardian releases the funds. Each heir receives the share you chose.' },
]

const REASONS = [
  { icon: 'key', title: 'Your key stays yours', text: 'You never hand a private key to family, a lawyer or a company.' },
  { icon: 'shield', title: 'Guardians decide when, never who', text: 'They can start a release, but they cannot change who is paid or how much.' },
  { icon: 'lock', title: 'You can stop it', text: 'A check-in or a cancel stops a release at any point before the countdown ends.' },
  { icon: 'visibility_off', title: 'Heirs can stay hidden', text: 'Keep heirs off the public record until a release, using secret codes.' },
]

export function ProblemSection() {
  return (
    <section className="landing-section landing-problem">
      <h2>Crypto can be lost when its owner is gone</h2>
      <p>Only a private key can move crypto. Share it early and you trust someone with everything today. Keep it to yourself and your funds may be lost for good. Pal gives you a third way.</p>
    </section>
  )
}

export function HowSection() {
  return (
    <section className="landing-section" id="how" aria-labelledby="how-title">
      <h2 id="how-title">How it works</h2>
      <ol className="landing-steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="landing-step-number">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function ReasonsSection() {
  return (
    <section className="landing-section landing-reasons" aria-labelledby="reasons-title">
      <h2 id="reasons-title">You stay in control</h2>
      <ul className="landing-grid">
        {REASONS.map((r) => (
          <li key={r.title}>
            <span className="landing-icon">
              <Icon name={r.icon} />
            </span>
            <h3>{r.title}</h3>
            <p>{r.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <span>Pal</span>
      <span>A test version on NEAR testnet and Ethereum Sepolia. Never send real money to a vault.</span>
    </footer>
  )
}
