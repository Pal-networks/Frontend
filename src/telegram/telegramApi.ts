// Talks to Pal's small backend (api/index.ts) about Telegram alerts.
// Linking and unlinking are signed with the person's NEAR key, so nobody else
// can connect their own Telegram to someone's vaults.

type SignHash = (hash: `0x${string}`) => Promise<`0x${string}`>

export interface TelegramStatus {
  /** False when the site has no bot or database set up (for example on localhost). */
  available: boolean
  linked: boolean
}

/** Must match proofMessage in api/index.ts exactly. */
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/${path}`, init)
  } catch {
    throw new Error('Could not reach Pal. Check your connection and try again.')
  }
  // The local dev server has no backend and answers with the app's own page.
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    throw new Error('Telegram alerts are not available on this site.')
  }
  const body = (await res.json()) as T & { error?: string }
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Please try again.')
  return body
}

export async function getTelegramStatus(accountId: string): Promise<TelegramStatus> {
  try {
    return await api<TelegramStatus>(`telegram/status?account=${encodeURIComponent(accountId)}`)
  } catch (e) {
    if (e instanceof Error && /not available/.test(e.message)) return { available: false, linked: false }
    throw e
  }
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
