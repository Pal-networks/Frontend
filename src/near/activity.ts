// A vault's history, read from FastNEAR's public transaction index. The contract
// keeps no history itself. No imports, so this can be tested on its own.

const TX_API = 'https://tx.test.fastnear.com'
/** The most recent contract transactions to look through. */
const LIMIT = 200
/** The index accepts this many transactions per lookup. */
const BATCH = 20

export interface ActivityItem {
  hash: string
  whenMs: number
  who: string
  method: string
  args: Record<string, unknown>
}

interface IndexEntry {
  transaction_hash: string
  tx_block_timestamp: string
  is_success: boolean
}

interface TxDetail {
  transaction: {
    hash: string
    signer_id: string
    actions: { FunctionCall?: { method_name: string; args: string } }[]
  }
  receipts?: unknown[]
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${TX_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`The activity service answered ${res.status}.`)
  return res.json() as Promise<T>
}

function decodeArgs(b64: string): Record<string, unknown> {
  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return {}
  }
}

/** Successful actions on one vault, newest first. Refused calls changed nothing, so they are left out. */
export async function fetchVaultActivity(contractId: string, vaultId: number): Promise<ActivityItem[]> {
  const { account_txs } = await post<{ account_txs: IndexEntry[] }>('/v0/account', {
    account_id: contractId,
    is_function_call: true,
    limit: LIMIT,
    desc: true,
  })
  const entries = account_txs.filter((t) => t.is_success)
  const when = new Map(entries.map((t) => [t.transaction_hash, Math.round(Number(t.tx_block_timestamp) / 1e6)]))

  const items: ActivityItem[] = []
  for (let i = 0; i < entries.length; i += BATCH) {
    const tx_hashes = entries.slice(i, i + BATCH).map((t) => t.transaction_hash)
    const { transactions } = await post<{ transactions: TxDetail[] }>('/v0/transactions', { tx_hashes })
    for (const t of transactions) {
      const call = t.transaction.actions[0]?.FunctionCall
      if (!call) continue
      const args = decodeArgs(call.args)
      // create_vault has no vault number in its arguments; the contract logs it instead.
      const mine =
        call.method_name === 'create_vault' ? JSON.stringify(t.receipts ?? []).includes(`"vault_created:${vaultId}"`) : args.vault_id === vaultId
      if (mine) items.push({ hash: t.transaction.hash, whenMs: when.get(t.transaction.hash) ?? 0, who: t.transaction.signer_id, method: call.method_name, args })
    }
  }
  return items.sort((a, b) => b.whenMs - a.whenMs)
}
