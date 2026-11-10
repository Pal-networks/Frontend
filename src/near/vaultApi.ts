import { config } from '../config'
import type { Span } from '../wizard/logic'
import { plainContractError } from './errors'
import { provider } from './rpc'
import { requireNearAccount } from './session'

export type Phase = 'inactive' | 'alive' | 'guardians_may_act' | 'pending_approval' | 'countdown' | 'executable'

export interface Heir {
  eth_address: string
  bps: number
  salt: string
  label: string
}
export interface GuardianInvite {
  account: string
  state: 'accepted' | 'invited' | 'expired'
  expires_at_ns: number
}

/** What anyone can read about a vault (the contract's get_rules). */
export interface Rules {
  vault_id: number
  name: string
  owner: string
  guardians: string[]
  guardians_accepted: string[]
  guardian_invites: GuardianInvite[]
  invite_validity: Span
  setup_complete: boolean
  threshold: number
  check_in_interval: Span
  silence_period: Span
  waiting_period: Span
  heirs_hidden: boolean
  heir_commitments: string[]
  heirs: Heir[]
  signer_contract: string
  derivation_path: string
  ethereum_chain_id: number
}

/** Where the vault is in its life (the contract's get_status). */
export interface Status {
  phase: Phase
  now_ns: number
  last_check_in_ns: number
  next_check_in_due_ns: number
  silence_ends_ns: number
  approvals: string[]
  executable_at_ns: number | null
  execution_started: boolean
  /** The Ethereum nonce of the first payout, once the numbers are fixed. */
  execution_base_nonce?: number | null
  /**
   * Guardians who pressed Release funds after the countdown. Payments start
   * once there are as many as the threshold. Missing on an older contract,
   * where one guardian's press was enough.
   */
  release_confirmations?: string[]
}

export const getRules = (vaultId: number) =>
  provider.callFunction<Rules>({ contractId: config.vaultAccount, method: 'get_rules', args: { vault_id: vaultId } }) as Promise<Rules>

export const getStatus = (vaultId: number) =>
  provider.callFunction<Status>({ contractId: config.vaultAccount, method: 'get_status', args: { vault_id: vaultId } }) as Promise<Status>

/** 0.05 NEAR for storage on edits. What is not used is sent back. */
export const EDIT_DEPOSIT_YOCTO = '50000000000000000000000'

/**
 * Sends one call to the vault contract, signed by the Privy wallet. There is no
 * pop-up, so the button that calls this is the person's confirmation. Returns
 * what the method returned. A refusal comes back as the contract's own message.
 */
export async function sendVaultCall(
  methodName: string,
  args: object,
  opts: { gasTgas?: number; depositYocto?: string } = {},
): Promise<unknown> {
  try {
    return await requireNearAccount().callFunction({
      contractId: config.vaultAccount,
      methodName,
      args: args as Record<string, unknown>,
      gas: String((opts.gasTgas ?? 30) * 1_000_000_000_000),
      deposit: opts.depositYocto ?? '0',
    })
  } catch (e) {
    throw plainContractError(e)
  }
}
