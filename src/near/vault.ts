import { config } from '../config'
import { provider } from './rpc'

/** One line in a "My vaults" list (from the contract's get_vaults_by_owner). */
export interface VaultSummary {
  vault_id: number
  name: string
  owner: string
}

/** Vaults this account was added to as a guardian. */
export async function getVaultsForGuardian(accountId: string): Promise<VaultSummary[]> {
  const result = await provider.callFunction<VaultSummary[]>({
    contractId: config.vaultAccount,
    method: 'get_vaults_for_guardian',
    args: { account_id: accountId },
  })
  return result ?? []
}

/** Vaults this account owns. A read-only call: free. */
export async function getVaultsByOwner(accountId: string): Promise<VaultSummary[]> {
  const result = await provider.callFunction<VaultSummary[]>({
    contractId: config.vaultAccount,
    method: 'get_vaults_by_owner',
    args: { account_id: accountId },
  })
  return result ?? []
}
