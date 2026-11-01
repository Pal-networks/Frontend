import type { Account } from 'near-api-js'

// The signed-in person's NEAR account. Set by AuthContext, used to send transactions.
let current: Account | null = null

export function setNearAccount(account: Account | null) {
  current = account
}

export function requireNearAccount(): Account {
  if (!current) throw new Error('Please sign in first.')
  return current
}
