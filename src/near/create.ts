import type { CreateVaultArgs } from '../wizard/logic'
import { getBalance } from './rpc'
import { sendVaultCall } from './vaultApi'

/** 0.1 NEAR pays for the vault's storage. Whatever is not needed is sent back. */
const STORAGE_DEPOSIT_YOCTO = '100000000000000000000000'
/** Needs a little more than the deposit, for the network fee. */
const MIN_BALANCE_YOCTO = 150_000_000_000_000_000_000_000n

/** Sends create_vault and returns the new vault's number. */
export async function createVault(accountId: string, args: CreateVaultArgs): Promise<number> {
  const balance = await getBalance(accountId)
  if (balance.yocto < MIN_BALANCE_YOCTO) {
    throw new Error('Your account needs at least 0.15 test NEAR to create a vault. Add some and try again.')
  }
  const id = await sendVaultCall('create_vault', args, { gasTgas: 50, depositYocto: STORAGE_DEPOSIT_YOCTO })
  if (typeof id !== 'number') throw new Error('The vault was sent, but the network did not return its number. Check "Your vaults".')
  return id
}
