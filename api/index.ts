/**
 * Pal's small backend: Telegram alerts. Testnet only.
 *
 * One Vercel Function answers every /api path (vercel.json sends /api/* here):
 *   GET  /api/telegram/status?account=…   is this NEAR account linked to Telegram?
 *   POST /api/telegram/link               signed by the account: returns a one-time t.me link
 *   POST /api/telegram/unlink             signed by the account: turns alerts off
 *   POST /api/telegram/webhook            called by Telegram when someone writes to the bot
 *   POST /api/telegram/setup              (secret) points the bot's webhook here
 *   GET  /api/notify                      (secret) called every minute by an outside scheduler
 *
 * Proving who you are: a Privy NEAR account's ID is its ed25519 public key, so
 * the app signs a short message and this server checks the signature against
 * the account ID. No Privy secret is needed.
 *
 * Everything lives in this one file on purpose: Vercel runs it as an ES module,
 * so the code has no relative imports to resolve.
 */
import { createHash, createPublicKey, randomBytes, timingSafeEqual, verify } from 'node:crypto'
import { getAddress, keccak256 } from 'viem'

// ------------------------------------------------------------------ settings

/** Read on every call, so tests can change them. Secrets are Vercel Secret variables, never VITE_. */
function settings() {
  const env = (name: string) => (process.env[name] ?? '').trim()
  const productionHost = env('VERCEL_PROJECT_PRODUCTION_URL')
  return {
    botToken: env('TELEGRAM_BOT_TOKEN'),
    botUsername: env('TELEGRAM_BOT_USERNAME').replace(/^@/, ''),
    webhookSecret: env('TELEGRAM_WEBHOOK_SECRET'),
    cronSecret: env('CRON_SECRET'),
    // Upstash Redis from the Vercel Marketplace sets one of these pairs.
    redisUrl: env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL'),
    redisToken: env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN'),
    // The same settings the web app uses.
    nearRpc: env('VITE_NEAR_RPC') || 'https://test.rpc.fastnear.com',
    vaultAccount: env('VITE_VAULT_ACCOUNT'),
    signerContract: env('VITE_SIGNER_CONTRACT') || 'v1.signer-prod.testnet',
    sepoliaRpc: env('VITE_SEPOLIA_RPC') || 'https://ethereum-sepolia-rpc.publicnode.com',
    appUrl: env('PAL_APP_URL') || (productionHost ? `https://${productionHost}` : ''),
  }
}

type Json = Record<string, unknown>

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** A refusal whose message is safe to show to the person. */
class Refusal extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function sameSecret(given: string, expected: string): boolean {
  if (!expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** For the routes only the scheduler and the owner of the deployment may call. */
function requireCronSecret(request: Request, url: URL) {
  const header = request.headers.get('authorization') ?? ''
  const given = header.startsWith('Bearer ') ? header.slice(7) : (url.searchParams.get('key') ?? '')
  if (!sameSecret(given, settings().cronSecret)) throw new Refusal('Not allowed.', 401)
}

// --------------------------------------------------------------------- redis

/** One command through Upstash's REST API: POST a JSON array, read { result } or { error }. */
async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  const { redisUrl, redisToken } = settings()
  if (!redisUrl || !redisToken) throw new Error('The alert database is not set up (Upstash Redis).')
  const res = await fetch(redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}` },
    body: JSON.stringify(command),
  })
  const out = (await res.json()) as { result?: T; error?: string }
  if (!res.ok || out.error) throw new Error(`Database error: ${out.error ?? res.status}`)
  return out.result as T
}

// Keys. Account IDs are 64 hex characters, chat IDs are numbers.
// The every-minute check reads only `chats` and `sent` (two commands), to stay
// well inside Upstash's free monthly allowance.
const KEY = {
  code: (code: string) => `tg:code:${code}`, // one-time link code -> account
  chats: 'tg:chats', // hash: account -> chat
  accountsOf: (chat: string) => `tg:chat-accounts:${chat}`, // chat -> set of accounts
  usedProof: (signature: string) => `tg:used:${signature.slice(2, 66)}`,
  sent: 'tg:sent', // set of "alert id|account" already sent
}

/** HGETALL comes back from the REST API as a flat [field, value, field, value…] list. */
function pairs(flat: string[] | null): Map<string, string> {
  const map = new Map<string, string>()
  for (let i = 0; flat && i + 1 < flat.length; i += 2) map.set(flat[i], flat[i + 1])
  return map
}

// ------------------------------------------------------------------ telegram

async function telegram(method: string, body: Json): Promise<{ ok: boolean; description?: string; result?: unknown }> {
  const { botToken } = settings()
  if (!botToken) throw new Error('The Telegram bot is not set up.')
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return (await res.json()) as { ok: boolean; description?: string; result?: unknown }
}

async function sendText(chatId: string, text: string) {
  const out = await telegram('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true } })
  if (!out.ok) console.error('[pal] Telegram refused a message:', out.description)
  return out.ok
}

// ------------------------------------------------------------- proving who you are

const PROOF_MAX_AGE_MS = 5 * 60_000

/** The exact text the app signs. The web app builds the same text (src/telegram/telegramApi.ts). */
export function proofMessage(action: string, accountId: string, issuedAt: number): string {
  return `Pal Telegram alerts\naction: ${action}\naccount: ${accountId}\nissued: ${issuedAt}`
}

/** Checks a signed request and returns the NEAR account that signed it. */
async function verifyProof(action: string, body: Json): Promise<string> {
  const accountId = String(body.accountId ?? '')
  const issuedAt = Number(body.issuedAt)
  const signature = String(body.signature ?? '')
  if (!/^[0-9a-f]{64}$/.test(accountId)) throw new Refusal('Telegram alerts work with Pal accounts only.')
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > PROOF_MAX_AGE_MS) {
    throw new Refusal('This request is too old. Please try again.')
  }
  if (!/^0x[0-9a-fA-F]{128}$/.test(signature)) throw new Refusal('The signature is missing.')

  const hash = createHash('sha256').update(proofMessage(action, accountId, issuedAt)).digest()
  const key = createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(accountId, 'hex').toString('base64url') },
    format: 'jwk',
  })
  if (!verify(null, hash, key, Buffer.from(signature.slice(2), 'hex'))) {
    throw new Refusal('The signature does not match this account.', 401)
  }
  // Each signed request works once.
  const fresh = await redis<string | null>('SET', KEY.usedProof(signature.toLowerCase()), '1', 'NX', 'EX', 900)
  if (fresh !== 'OK') throw new Refusal('This request was already used. Please try again.')
  return accountId
}

// ------------------------------------------------------------- linking

async function linkAccount(account: string, chat: string) {
  const previous = await redis<string | null>('HGET', KEY.chats, account)
  if (previous && previous !== chat) await redis('SREM', KEY.accountsOf(previous), account)
  await redis('HSET', KEY.chats, account, chat)
  await redis('SADD', KEY.accountsOf(chat), account)
}

/** Turns alerts off for one account. Returns the chat it was linked to, if any. */
async function unlinkAccount(account: string): Promise<string | null> {
  const chat = await redis<string | null>('HGET', KEY.chats, account)
  await redis('HDEL', KEY.chats, account)
  if (chat) await redis('SREM', KEY.accountsOf(chat), account)
  return chat
}

const short = (account: string) => (account.length > 16 ? `${account.slice(0, 6)}…${account.slice(-4)}` : account)

async function handleWebhook(request: Request): Promise<Response> {
  if (!sameSecret(request.headers.get('x-telegram-bot-api-secret-token') ?? '', settings().webhookSecret)) {
    return reply({ error: 'Not allowed.' }, 401)
  }
  // Telegram retries anything that is not a 200, so problems are logged, not returned.
  try {
    const update = (await request.json()) as { message?: { text?: string; chat?: { id?: number; type?: string } } }
    const text = update.message?.text?.trim() ?? ''
    const chatId = update.message?.chat?.id
    if (chatId === undefined || update.message?.chat?.type !== 'private') return reply({ ok: true })
    const chat = String(chatId)
    const [command, argument = ''] = text.split(/\s+/, 2)

    if (command === '/start' && argument) {
      const account = await redis<string | null>('GETDEL', KEY.code(argument))
      if (!account) {
        await sendText(chat, 'This link has expired or was already used. Open Pal, open your account, and press Connect Telegram again.')
      } else {
        await linkAccount(account, chat)
        await sendText(chat, `Connected. Pal will message you here about the vaults of account ${short(account)}. Send /stop to turn alerts off.`)
      }
    } else if (command === '/stop') {
      const accounts = await redis<string[]>('SMEMBERS', KEY.accountsOf(chat))
      for (const account of accounts) await unlinkAccount(account)
      await sendText(chat, accounts.length ? 'Alerts are off. You can connect again from Pal at any time.' : 'This chat is not connected to Pal.')
    } else {
      await sendText(chat, 'This bot sends alerts from Pal. To connect, open Pal, open your account, and press Connect Telegram. Send /stop to turn alerts off.')
    }
  } catch (e) {
    console.error('[pal] webhook problem:', e)
  }
  return reply({ ok: true })
}

// ------------------------------------------------------------- reading NEAR and Ethereum

/** A read-only contract call over NEAR JSON-RPC (query / call_function). */
async function nearView<T>(contract: string, method: string, args: Json): Promise<T> {
  const res = await fetch(settings().nearRpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'pal',
      method: 'query',
      params: {
        request_type: 'call_function',
        finality: 'final',
        account_id: contract,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
      },
    }),
  })
  const out = (await res.json()) as { result?: { result?: number[]; error?: string }; error?: unknown }
  if (out.error || !out.result?.result) throw new Error(`NEAR read failed (${method}): ${JSON.stringify(out.error ?? out.result?.error)}`)
  return JSON.parse(Buffer.from(out.result.result).toString('utf8')) as T
}

async function ethCall(method: string, params: unknown[]): Promise<string> {
  const res = await fetch(settings().sepoliaRpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const out = (await res.json()) as { result?: string; error?: { message?: string } }
  if (!out.result) throw new Error(`Sepolia read failed (${method}): ${out.error?.message ?? 'no result'}`)
  return out.result
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58Decode(input: string): Uint8Array {
  let n = 0n
  for (const ch of input) {
    const i = BASE58.indexOf(ch)
    if (i < 0) throw new Error('Unexpected character in a base58 key')
    n = n * 58n + BigInt(i)
  }
  const bytes: number[] = []
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn))
    n >>= 8n
  }
  for (const ch of input) {
    if (ch === '1') bytes.unshift(0)
    else break
  }
  return Uint8Array.from(bytes)
}

/** The vault's Sepolia address, the same way the web app works it out (src/near/address.ts). */
async function vaultEthAddress(vaultId: number): Promise<string> {
  const { signerContract, vaultAccount } = settings()
  const key = await nearView<string>(signerContract, 'derived_public_key', {
    path: `vault-${vaultId}`,
    predecessor: vaultAccount,
    domain_id: 0,
  })
  const [scheme, b58] = key.split(':')
  if (scheme !== 'secp256k1' || !b58) throw new Error('The signer returned a key that is not secp256k1.')
  return getAddress(`0x${keccak256(base58Decode(b58)).slice(-40)}`)
}

// ------------------------------------------------------------- alerts

export interface Rules {
  vault_id: number
  name: string
  owner: string
  guardians: string[]
  guardians_accepted: string[]
  setup_complete: boolean
  threshold: number
  heirs: { eth_address: string; bps: number; label: string }[]
}

export interface Status {
  phase: string
  now_ns: number
  last_check_in_ns: number
  next_check_in_due_ns: number
  silence_ends_ns: number
  executable_at_ns: number | null
  execution_started: boolean
  execution_base_nonce?: number | null
}

export interface Alert {
  /** Unique for this event in this round of the vault's life, so it is sent once. */
  id: string
  to: 'owner' | 'guardians' | 'everyone'
  text: string
}

/** "about 2 minutes", "about 5 hours", "about 3 days". */
export function inWords(ns: number): string {
  const minutes = Math.max(1, Math.round(ns / 60e9))
  if (minutes < 90) return `about ${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.round(minutes / 60)
  if (hours < 36) return `about ${hours} hours`
  return `about ${Math.round(hours / 24)} days`
}

/**
 * What is worth telling people about one vault right now. Pure: the same vault
 * state always gives the same alerts, and each alert's id stops it repeating.
 * `paid` is true once every heir's payment has gone out on Ethereum.
 */
export function alertsFor(rules: Rules, status: Status, appUrl: string, paid: boolean): Alert[] {
  const v = rules.vault_id
  const name = `"${rules.name}"`
  const link = appUrl ? `\n${appUrl}/vault/${v}` : ''
  const now = status.now_ns
  const alerts: Alert[] = []
  if (!rules.setup_complete || status.phase === 'inactive') return alerts

  // Owner: a check-in is due, before guardians can act.
  if (status.phase === 'alive' && now >= status.next_check_in_due_ns) {
    alerts.push({
      id: `${v}:checkin-due:${status.last_check_in_ns}`,
      to: 'owner',
      text: `Time to check in on ${name}. Open Pal and press Check in. If you don't, its guardians can start a release in ${inWords(status.silence_ends_ns - now)}.${link}`,
    })
  }

  // The silence period is over: guardians may approve a release.
  if (status.phase === 'guardians_may_act' || status.phase === 'pending_approval') {
    alerts.push({
      id: `${v}:may-act-owner:${status.last_check_in_ns}`,
      to: 'owner',
      text: `You have not checked in on ${name}, so its guardians can now start a release. Open Pal and check in to stop it.${link}`,
    })
    alerts.push({
      id: `${v}:may-act-guardians:${status.last_check_in_ns}`,
      to: 'guardians',
      text: `The owner of ${name} has been silent for longer than they set. If you believe they can no longer check in, open Pal and approve the release.${link}`,
    })
  }

  // Owner: the countdown has started and can still be stopped.
  if (status.phase === 'countdown' && status.executable_at_ns) {
    alerts.push({
      id: `${v}:countdown:${status.executable_at_ns}`,
      to: 'owner',
      text: `Guardians have approved a release of ${name}. The funds go to your heirs in ${inWords(status.executable_at_ns - now)} unless you check in or cancel before then.${link}`,
    })
  }

  // Guardians: the countdown has ended, so they must press Release funds.
  if (status.phase === 'executable' && !status.execution_started && status.executable_at_ns) {
    const who = rules.threshold === 1 ? 'One guardian' : `${rules.threshold} guardians`
    alerts.push({
      id: `${v}:release-now:${status.executable_at_ns}`,
      to: 'guardians',
      text: `The countdown for ${name} has ended. ${who} must now open Pal and press Release funds.${link}`,
    })
  }

  // Everyone: the heirs have been paid.
  if (paid && status.execution_base_nonce !== null && status.execution_base_nonce !== undefined) {
    alerts.push({
      id: `${v}:paid:${status.execution_base_nonce}`,
      to: 'everyone',
      text: `The release of ${name} is complete. The heirs have been paid.${link}`,
    })
  }
  return alerts
}

/** Most a fully paid vault can still hold: the unused fee allowance (same rule as the web app). */
const LEFTOVER_PER_HEIR = 300_000n * 5_000_000_000n

async function releasePaid(rules: Rules, status: Status): Promise<boolean> {
  const base = status.execution_base_nonce
  if (!status.execution_started || base === null || base === undefined || rules.heirs.length === 0) return false
  const address = await vaultEthAddress(rules.vault_id)
  const [nonce, balance] = await Promise.all([
    ethCall('eth_getTransactionCount', [address, 'latest']),
    ethCall('eth_getBalance', [address, 'latest']),
  ])
  if (Number(BigInt(nonce)) < base + rules.heirs.length) return false
  return BigInt(balance) <= LEFTOVER_PER_HEIR * BigInt(rules.heirs.length)
}

/** One pass over every vault that has someone linked to Telegram. */
async function runNotify(): Promise<Json> {
  const { vaultAccount, appUrl } = settings()
  if (!vaultAccount) throw new Error('VITE_VAULT_ACCOUNT is not set.')
  const chats = pairs(await redis<string[]>('HGETALL', KEY.chats))
  const alreadySent = new Set(chats.size ? await redis<string[]>('SMEMBERS', KEY.sent) : [])
  const vaultIds = new Set<number>()

  for (const account of chats.keys()) {
    const [owned, guarding] = await Promise.all([
      nearView<{ vault_id: number }[]>(vaultAccount, 'get_vaults_by_owner', { account_id: account }),
      nearView<{ vault_id: number }[]>(vaultAccount, 'get_vaults_for_guardian', { account_id: account }),
    ])
    for (const v of [...owned, ...guarding]) vaultIds.add(v.vault_id)
  }

  let sent = 0
  const problems: string[] = []
  for (const vaultId of vaultIds) {
    try {
      const [rules, status] = await Promise.all([
        nearView<Rules>(vaultAccount, 'get_rules', { vault_id: vaultId }),
        nearView<Status>(vaultAccount, 'get_status', { vault_id: vaultId }),
      ])
      const paid = await releasePaid(rules, status)
      for (const alert of alertsFor(rules, status, appUrl, paid)) {
        const guardians = rules.guardians_accepted
        const people = alert.to === 'owner' ? [rules.owner] : alert.to === 'guardians' ? guardians : [rules.owner, ...guardians]
        for (const person of people) {
          const chat = chats.get(person)
          const mark = `${alert.id}|${person}`
          if (!chat || alreadySent.has(mark)) continue
          // Claim the alert first (SADD answers 1 only for the first run), so two runs at once cannot both send it.
          const fresh = await redis<number>('SADD', KEY.sent, mark)
          if (fresh === 1 && (await sendText(chat, alert.text))) sent++
        }
      }
    } catch (e) {
      console.error(`[pal] vault ${vaultId}:`, e)
      problems.push(`vault ${vaultId}`)
    }
  }
  return { linkedAccounts: chats.size, vaults: vaultIds.size, sent, problems }
}

// ------------------------------------------------------------- routes

async function readJson(request: Request): Promise<Json> {
  try {
    return (await request.json()) as Json
  } catch {
    throw new Refusal('The request was not valid JSON.')
  }
}

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url)
  // vercel.json passes the path after /api as ?route=…; locally the path is used.
  const path = (url.searchParams.get('route') ?? url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '')
  const s = settings()

  switch (`${request.method} ${path}`) {
    case 'GET telegram/status': {
      const account = url.searchParams.get('account') ?? ''
      const available = !!(s.botToken && s.botUsername && s.redisUrl && s.redisToken)
      if (!available) return reply({ available: false, linked: false })
      if (!/^[0-9a-f]{64}$/.test(account)) throw new Refusal('Unknown account.')
      return reply({ available: true, linked: !!(await redis<string | null>('HGET', KEY.chats, account)) })
    }

    case 'POST telegram/link': {
      if (!s.botUsername) throw new Refusal('Telegram alerts are not set up yet.', 503)
      const account = await verifyProof('link', await readJson(request))
      const code = randomBytes(24).toString('base64url') // 32 characters, allowed in a start link
      await redis('SET', KEY.code(code), account, 'EX', 900)
      return reply({ url: `https://t.me/${s.botUsername}?start=${code}` })
    }

    case 'POST telegram/unlink': {
      const account = await verifyProof('unlink', await readJson(request))
      const chat = await unlinkAccount(account)
      if (chat) await sendText(chat, `Alerts for account ${short(account)} were turned off in Pal.`)
      return reply({ ok: true })
    }

    case 'POST telegram/webhook':
      return handleWebhook(request)

    case 'POST telegram/setup': {
      requireCronSecret(request, url)
      if (!s.webhookSecret) throw new Refusal('Set TELEGRAM_WEBHOOK_SECRET first.')
      const me = await telegram('getMe', {})
      const hook = await telegram('setWebhook', {
        url: `${url.origin}/api/telegram/webhook`,
        secret_token: s.webhookSecret,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      })
      const username = (me.result as { username?: string } | undefined)?.username ?? null
      return reply({
        bot: username,
        botUsernameMatches: !!username && username.toLowerCase() === s.botUsername.toLowerCase(),
        webhookSet: hook.ok,
        webhookUrl: `${url.origin}/api/telegram/webhook`,
        problem: hook.ok ? null : hook.description,
      })
    }

    case 'GET notify':
    case 'POST notify':
      requireCronSecret(request, url)
      return reply(await runNotify())

    default:
      return reply({ error: 'Not found.' }, 404)
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await route(request)
    } catch (e) {
      if (e instanceof Refusal) return reply({ error: e.message }, e.status)
      console.error('[pal] api problem:', e)
      return reply({ error: 'Something went wrong on the server. Please try again.' }, 500)
    }
  },
}
