import { finalizeSignedTx, signerOf, type MpcSignature } from '../../eth/finalize'
import { planPayouts, TRANSFER_GAS_LIMIT } from '../../eth/plan'
import { broadcast, paymentSucceeded, readChainFacts } from '../../eth/sepolia'
import { sendVaultCall, type Rules, type Status } from '../../near/vaultApi'

export type ReleaseState =
  | { kind: 'done' } // every payment went out and the money left the vault
  | { kind: 'failed' } // payments were processed but the money is still in the vault
  | { kind: 'todo' } // there is still something to do

interface SignedPayout {
  to: string
  amount_wei: string
  nonce: number
  unsigned_tx_hex: string
  signature: MpcSignature
}

/** Above this per heir, money is still in the vault: more than any leftover fee allowance would be. */
const LEFTOVER_PER_HEIR = TRANSFER_GAS_LIMIT * 5_000_000_000n

/** Works out how far the release has got, from the contract and from Ethereum. */
export async function releaseState(rules: Rules, status: Status, address: string): Promise<ReleaseState> {
  const base = status.execution_base_nonce
  // An older contract reports that a release started but not where. Never guess with money.
  if (status.execution_started && (base === null || base === undefined)) {
    throw new Error('This release needs the contract update before it can continue.')
  }
  if (base === null || base === undefined) return { kind: 'todo' }
  const facts = await readChainFacts(address)
  if (facts.nonce < base + rules.heirs.length) return { kind: 'todo' }
  return facts.balance > LEFTOVER_PER_HEIR * BigInt(rules.heirs.length) ? { kind: 'failed' } : { kind: 'done' }
}

/**
 * Carries out the release from wherever it stopped. Reports progress in plain
 * words. Stops at the first problem, and never sends a payment whose signature
 * does not belong to the vault.
 */
export async function runRelease(rules: Rules, status: Status, address: string, say: (text: string) => void, onPaid: (hash: string, who: string) => void) {
  const vault_id = rules.vault_id
  say('Reading the vault balance…')
  const facts = await readChainFacts(address)
  let base = status.execution_base_nonce ?? null

  if (base === null) {
    planPayouts(facts.balance, facts.maxFeePerGas, rules.heirs.map((h) => h.bps)) // stops here if the balance is too low
    say('Fixing the payment details…')
    try {
      await sendVaultCall('start_execution', {
        vault_id,
        base_nonce: facts.nonce,
        total_wei: facts.balance.toString(),
        max_fee_per_gas: facts.maxFeePerGas.toString(),
        max_priority_fee_per_gas: facts.maxPriorityFeePerGas.toString(),
      })
    } catch (e) {
      // Another member's app got there first, which is fine.
      if (!(e instanceof Error) || !/already started/i.test(e.message)) throw e
    }
    base = facts.nonce
  }

  for (let i = Math.max(0, facts.nonce - base); i < rules.heirs.length; i++) {
    const heir = rules.heirs[i]
    const name = heir.label || `heir ${i + 1}`
    say(`Signing the payment to ${name}…`)
    const out = (await sendVaultCall('sign_payout', { vault_id, heir_index: i }, { gasTgas: 300 })) as SignedPayout | undefined
    if (!out?.signature) throw new Error('The network did not return a signature. Please try again.')
    const serialized = finalizeSignedTx(out.unsigned_tx_hex, out.signature)
    if ((await signerOf(serialized)).toLowerCase() !== address.toLowerCase()) {
      throw new Error("A signature did not match the vault's address, so nothing was sent.")
    }
    say(`Sending the payment to ${name}…`)
    let hash: `0x${string}` | null = null
    try {
      hash = await broadcast(serialized)
    } catch (e) {
      // Another member's app already sent this one.
      if (!(e instanceof Error) || !/nonce too low|already known/i.test(e.message)) throw e
    }
    if (hash) {
      say(`Waiting for Ethereum to confirm the payment to ${name}…`)
      if (!(await paymentSucceeded(hash))) throw new Error(`Ethereum could not complete the payment to ${name}. The money is still in the vault.`)
      onPaid(hash, name)
    }
  }
}
