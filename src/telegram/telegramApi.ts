// Talks to Pal's backend (the Railway service in ../backend) about Telegram alerts.
// Linking and unlinking are signed with the person's NEAR key, so nobody else
// can connect their own Telegram to someone's vaults.
import { config } from '../config'

type SignHash = (hash: `0x${string}`) => Promise<`0x${string}`>

export interface TelegramStatus {
  /** False when no backend address is set, or the backend cannot be reached. */
  available: boolean
  linked: boolean
  /** "@username" or the first name of the connected Telegram account, when known. */
  telegram?: string | null
}

/** Must match proofMessage in backend/src/proof.ts exactly. */
function proofMessage(action: string, accountId: string, issuedAt: number): string {
  return `Pal Telegram alerts\naction: ${action}\naccount: ${accountId}\nissued: ${issuedAt}`
}

async function sha256Hex(text: string): Promise<`0x${string}`> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return `0x${Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

async function signedBody(action: string, accountId: string, signHash: SignHash) {
  const issuedAt = Date.now()
  const signature = await signHash(await sha256Hex(proofMessage(action, accountId, issuedAt)))
  return JSON.stringify({ accountId, issuedAt, signature })
}

class Unreachable extends Error {}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!config.palApiUrl) throw new Unreachable('Telegram alerts are not set up on this site.')
  let res: Response
  try {
    res = await fetch(`${config.palApiUrl}/${path}`, init)
  } catch {
    throw new Unreachable('Could not reach Pal’s alert service. Please try again later.')
  }
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    throw new Unreachable('Pal’s alert service gave an unexpected answer. Please try again later.')
  }
  const body = (await res.json()) as T & { error?: string }
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Please try again.')
  return body
}

export async function getTelegramStatus(accountId: string): Promise<TelegramStatus> {
  if (!config.palApiUrl) return { available: false, linked: false }
  return api<TelegramStatus>(`telegram/status?account=${encodeURIComponent(accountId)}`)
}

/** Returns a one-time Telegram link. Opening it and pressing Start finishes the connection. */
export async function startTelegramLink(accountId: string, signHash: SignHash): Promise<string> {
  const body = await signedBody('link', accountId, signHash)
  const out = await api<{ url: string }>('telegram/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  return out.url
}

export async function stopTelegramAlerts(accountId: string, signHash: SignHash): Promise<void> {
  const body = await signedBody('unlink', accountId, signHash)
  await api('telegram/unlink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
}
