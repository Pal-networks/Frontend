// Rules and data for the "new vault" wizard. No UI and no network code here, so
// it can be tested on its own. Everything mirrors what the contract checks.
import { isAddress } from 'viem'

export const UNITS = ['Minutes', 'Hours', 'Days', 'Months', 'Years'] as const
export type Unit = (typeof UNITS)[number]
export interface Span {
  amount: number
  unit: Unit
}

/** Months are 30 days and years are 365 days, exactly as in the contract. */
export const UNIT_SECONDS: Record<Unit, number> = {
  Minutes: 60,
  Hours: 3_600,
  Days: 86_400,
  Months: 30 * 86_400,
  Years: 365 * 86_400,
}

export const MAX_GUARDIANS = 7
export const MAX_HEIRS = 10
export const MAX_NAME = 64
export const MAX_SPAN_SECONDS = 100 * 365 * 86_400 // the contract allows at most 100 years
export const SEPOLIA_CHAIN_ID = 11_155_111

export interface HeirDraft {
  id: string
  /** A name for this address. Public on the blockchain unless heirs are hidden. */
  name: string
  address: string
  /** Typed by the owner, for example "60" or "33.5". */
  percent: string
}

export interface WizardState {
  name: string
  hideHeirs: boolean
  heirs: HeirDraft[]
  guardians: string[]
  threshold: number
  checkIn: Span
  silence: Span
  waiting: Span
  demo: boolean
}

/** How a wizard step changes part of the form. */
export type Patch = (p: Partial<WizardState>) => void

export const REAL_TIMERS = {
  checkIn: { amount: 30, unit: 'Days' } as Span,
  silence: { amount: 90, unit: 'Days' } as Span,
  waiting: { amount: 14, unit: 'Days' } as Span,
}
export const DEMO_TIMERS = {
  checkIn: { amount: 1, unit: 'Minutes' } as Span,
  silence: { amount: 2, unit: 'Minutes' } as Span,
  waiting: { amount: 2, unit: 'Minutes' } as Span,
}
/** How long a guardian's invitation stays valid. */
export const INVITE_EXPIRY = { real: { amount: 7, unit: 'Days' } as Span, demo: { amount: 10, unit: 'Minutes' } as Span }

export function newState(): WizardState {
  return {
    name: '',
    hideHeirs: false,
    heirs: [],
    guardians: [],
    threshold: 2,
    ...REAL_TIMERS,
    demo: false,
  }
}

let counter = 0
export const newHeir = (): HeirDraft => ({ id: `h${Date.now()}-${counter++}`, name: '', address: '', percent: '' })

export const spanSeconds = (s: Span): number => s.amount * UNIT_SECONDS[s.unit]

// ------------------------------------------------------------------ parsing

/** "60" -> 6000 basis points, "33.5" -> 3350. Null if it is not a valid percentage. */
export function parseBps(percent: string): number | null {
  const t = percent.trim()
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null
  const bps = Math.round(parseFloat(t) * 100)
  return bps > 0 && bps <= 10_000 ? bps : null
}

export function totalBps(heirs: HeirDraft[]): number {
  return heirs.reduce((sum, h) => sum + (parseBps(h.percent) ?? 0), 0)
}

/** NEAR account rules (NEAR docs, "Validating Recipient Accounts"). */
export function isNearAccountId(id: string): boolean {
  return id.length >= 2 && id.length <= 64 && /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(id)
}

// --------------------------------------------------------------- validation
// Each returns a plain-words message, or null when everything is fine.

export function validateName(s: WizardState): string | null {
  const n = s.name.trim()
  if (!n) return 'Give your vault a name, for example "My Family".'
  if (n.length > MAX_NAME) return `Keep the name under ${MAX_NAME + 1} characters.`
  return null
}

export function validateHeirs(s: WizardState): string | null {
  if (s.heirs.length === 0) return null // optional: can be added later
  if (s.heirs.length > MAX_HEIRS) return `A vault can have at most ${MAX_HEIRS} heirs.`
  const seen = new Set<string>()
  for (const [i, h] of s.heirs.entries()) {
    const who = `Heir ${i + 1}`
    if (!isAddress(h.address.trim(), { strict: false })) return `${who}: this is not a valid Ethereum address.`
    const addr = h.address.trim().toLowerCase()
    if (seen.has(addr)) return `${who}: this address is already in the list.`
    seen.add(addr)
    if (parseBps(h.percent) === null) return `${who}: enter a share between 0.01 and 100 percent.`
    if (h.name.trim().length > MAX_NAME) return `${who}: the name is too long.`
  }
  const total = totalBps(s.heirs)
  if (total !== 10_000) return `The shares add up to ${total / 100}%. They must add up to exactly 100%.`
  return null
}

export function validateGuardians(s: WizardState, ownerId: string): string | null {
  const g = s.guardians
  if (g.length === 0) return null // optional: can be added later
  if (g.length > MAX_GUARDIANS) return `A vault can have at most ${MAX_GUARDIANS} guardians.`
  const seen = new Set<string>()
  for (const [i, raw] of g.entries()) {
    const id = raw.trim()
    const who = `Guardian ${i + 1}`
    if (!id) return `${who}: enter a NEAR account, or remove this row.`
    if (!isNearAccountId(id)) return `${who}: "${id}" is not a valid NEAR account.`
    if (id === ownerId) return `${who}: you cannot be your own guardian.`
    if (seen.has(id)) return `${who}: this account is already in the list.`
    seen.add(id)
  }
  if (s.threshold < 1 || s.threshold > g.length) return 'Choose how many guardians must agree.'
  return null
}

export function validateTimers(s: WizardState): string | null {
  for (const [label, span] of [
    ['Check-in interval', s.checkIn],
    ['Silence period', s.silence],
    ['Waiting period', s.waiting],
  ] as const) {
    if (!Number.isInteger(span.amount) || span.amount < 1) return `${label}: enter a whole number of 1 or more.`
    if (spanSeconds(span) > MAX_SPAN_SECONDS) return `${label}: this is longer than 100 years.`
  }
  if (spanSeconds(s.silence) < spanSeconds(s.checkIn))
    return 'The silence period must be at least as long as the check-in interval.'
  return null
}

// ----------------------------------------------------------------- wording

export function formatSpan(s: Span): string {
  const unit = s.unit.toLowerCase()
  return `${s.amount} ${s.amount === 1 ? unit.replace(/s$/, '') : unit}`
}

/** One plain-language paragraph for the review step. */
export function describe(s: WizardState): string {
  const timers = `If you miss check-ins for ${formatSpan(s.silence)}`
  const g = s.guardians.filter((x) => x.trim())
  const guardianPart =
    g.length === 0
      ? 'You have not added guardians yet, so nothing can be released until you add them'
      : `${s.threshold} of your ${g.length} guardian${g.length === 1 ? '' : 's'} can start a ${formatSpan(s.waiting)} countdown. You can cancel at any time before it ends`
  const heirPart =
    s.heirs.length === 0
      ? 'You have not added heirs yet, so there is nobody to receive anything until you add them.'
      : s.hideHeirs
        ? `After the countdown, your ${s.heirs.length} hidden heir${s.heirs.length === 1 ? '' : 's'} receive${s.heirs.length === 1 ? 's' : ''} their shares.`
        : `After the countdown, ${s.heirs
            .map((h) => `${h.name.trim() || 'heir ' + (s.heirs.indexOf(h) + 1)} (${parseFloat(h.percent)}%)`)
            .join(', ')} receive their shares.`
  return g.length === 0 ? `${guardianPart}. ${heirPart}` : `${timers}, ${guardianPart}. ${heirPart}`
}

// -------------------------------------------------- hidden heirs + the call

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

export function randomSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)))
}

/** sha256("lowercase_address|bps|salt") as hex: exactly what the contract checks. */
export async function commitment(address: string, bps: number, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${address.toLowerCase()}|${bps}|${salt}`)
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)))
}

/** What the owner must keep for each hidden heir. Losing the salt means that heir cannot be revealed. */
export interface HeirCard {
  name: string
  address: string
  percent: string
  salt: string
}

export interface CreateVaultArgs {
  name: string
  guardians: string[]
  threshold: number
  check_in_interval: Span
  silence_period: Span
  waiting_period: Span
  invite_expiry: Span
  public_heirs: { eth_address: string; bps: number; salt: string; label: string }[]
  heir_commitments: string[]
  chain_id: number
}

/** The arguments for the contract's create_vault, plus the cards for hidden heirs. */
export async function buildCreateVaultArgs(s: WizardState): Promise<{ args: CreateVaultArgs; cards: HeirCard[] }> {
  const guardians = s.guardians.map((g) => g.trim()).filter(Boolean)
  const cards: HeirCard[] = []
  let publicHeirs: CreateVaultArgs['public_heirs'] = []
  let commitments: string[] = []

  if (s.hideHeirs) {
    for (const h of s.heirs) {
      const bps = parseBps(h.percent) as number
      const salt = randomSalt()
      commitments.push(await commitment(h.address.trim(), bps, salt))
      cards.push({ name: h.name.trim(), address: h.address.trim().toLowerCase(), percent: h.percent.trim(), salt })
    }
  } else {
    publicHeirs = s.heirs.map((h) => ({
      eth_address: h.address.trim().toLowerCase(),
      bps: parseBps(h.percent) as number,
      salt: '',
      label: h.name.trim(),
    }))
    commitments = []
  }

  return {
    args: {
      name: s.name.trim(),
      guardians,
      threshold: guardians.length === 0 ? 0 : s.threshold,
      check_in_interval: s.checkIn,
      silence_period: s.silence,
      waiting_period: s.waiting,
      invite_expiry: s.demo ? INVITE_EXPIRY.demo : INVITE_EXPIRY.real,
      public_heirs: publicHeirs,
      heir_commitments: commitments,
      chain_id: SEPOLIA_CHAIN_ID,
    },
    cards,
  }
}
