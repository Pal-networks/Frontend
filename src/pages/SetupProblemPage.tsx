import { InfoLine } from '../components/Messages'
import { Shell } from '../components/Shell'

/** Shown when a required setting is missing from .env.local. */
export function SetupProblemPage({ missing }: { missing: string[] }) {
  return (
    <Shell>
      <section className="card">
        <h1>Setup needed</h1>
        <p className="lead">These settings are empty in the file .env.local:</p>
        <ul className="plain-list">
          {missing.map((m) => (
            <li key={m}>
              <code>{m}</code>
            </li>
          ))}
        </ul>
        <InfoLine>Fill them in, save the file, then restart the app.</InfoLine>
      </section>
    </Shell>
  )
}
