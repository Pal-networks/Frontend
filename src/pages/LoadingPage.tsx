import { Shell } from '../components/Shell'

/** Placeholder blocks shown while the app starts. */
export function LoadingPage() {
  return (
    <Shell>
      <section className="card" aria-busy="true" aria-label="Loading">
        <div className="stack">
          <div className="skeleton sk-title" />
          <div className="skeleton sk-line center-line" style={{ width: '75%' }} />
        </div>
        <div className="stack">
          <div className="skeleton sk-button" />
        </div>
        <div className="skeleton sk-box" />
      </section>
    </Shell>
  )
}
