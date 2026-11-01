import type { ReactNode } from 'react'

const CLOUD = 'M46 96a30 30 0 0 1-4-59.7A44 44 0 0 1 124 18a35 35 0 0 1 54 22 28 28 0 0 1 22 56z'

function Cloud({ className }: { className: string }) {
  return (
    <svg className={`cloud ${className}`} viewBox="0 0 240 100" aria-hidden="true" focusable="false">
      <path d={CLOUD} fill="currentColor" />
    </svg>
  )
}

/** The sky behind the headline. The clouds are drawn here, so no image is loaded. */
export function SkyHero({ children }: { children: ReactNode }) {
  return (
    <section className="sky" aria-labelledby="landing-title">
      <div className="sky-clouds">
        <Cloud className="cloud-far-1" />
        <Cloud className="cloud-far-2" />
        <Cloud className="cloud-mid-1" />
        <Cloud className="cloud-mid-2" />
        <Cloud className="cloud-near-1" />
        <Cloud className="cloud-near-2" />
        <Cloud className="cloud-near-3" />
      </div>
      <div className="sky-content">{children}</div>
    </section>
  )
}
