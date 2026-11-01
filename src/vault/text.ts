import type { Phase } from '../near/vaultApi'

/** The phase in plain words, for someone who is not technical. */
export const PHASE_TEXT: Record<Phase, { title: string; detail: string }> = {
  inactive: {
    title: 'Waiting for guardians',
    detail: 'Some guardians have not accepted their invitation yet. Guardians cannot act until they all have.',
  },
  alive: { title: 'Active', detail: 'The owner is checking in. Nothing will happen while they keep checking in.' },
  guardians_may_act: {
    title: 'Owner has been silent',
    detail: 'The silence period is over. Guardians can now start a release. The owner can still check in to stop it.',
  },
  pending_approval: {
    title: 'Release started',
    detail: 'A guardian has approved. More guardians need to agree before the countdown starts.',
  },
  countdown: {
    title: 'Countdown running',
    detail: 'Enough guardians agreed. The owner can still cancel until the countdown ends.',
  },
  executable: {
    title: 'Countdown finished',
    detail: 'The waiting period is over. The owner can no longer cancel. A guardian can now release the funds to the heirs.',
  },
}

/** Nanoseconds since 1970 (as the contract counts) to a readable date and time. */
export function formatNs(ns: number): string {
  return new Date(ns / 1e6).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** A time left, for a countdown: "2d 3h", "4h 12m", "1m 05s", "42s". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

export const shortEth = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

/** "956b70…3db" for long hex accounts, the full name for short ones. */
export const shortAccount = (id: string) => (id.length > 22 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id)
