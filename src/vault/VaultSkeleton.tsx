import { Shell } from '../components/Shell'

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <section className="card" aria-hidden="true">
      <div className="skeleton sk-line" style={{ width: '45%', height: 20 }} />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton sk-line" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </section>
  )
}

/** The shape of the vault page while it loads. */
export function VaultSkeleton() {
  return (
    <Shell bare>
      <aside className="sidebar" aria-hidden="true">
        <div className="skeleton sk-line" style={{ width: '60%' }} />
        <div className="skeleton sk-line" style={{ width: '80%', height: 18 }} />
        <div className="stack">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton sk-box" />
          ))}
        </div>
      </aside>
      <div className="content stack-lg" aria-busy="true" aria-label="Loading the vault">
        <div className="two-cards">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton lines={2} />
        <CardSkeleton lines={4} />
      </div>
    </Shell>
  )
}
