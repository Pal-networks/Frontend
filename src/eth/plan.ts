// The payout maths, exactly as the contract does it (contract: payout_amount).
// Pure, so it can be tested. The contract has the final say: it recomputes
// these numbers itself and the transactions it signs come from its own maths.

/** Gas limit per payout, the same as the contract's. High enough for a brand-new empty address. */
export const TRANSFER_GAS_LIMIT = 300_000n

export interface PayoutPlan {
  feeTotal: bigint
  distributable: bigint
  /** Wei for each heir, in the same order as the heirs. */
  amounts: bigint[]
  /** What stays in the vault: rounding dust. */
  dust: bigint
}

/**
 * (total balance - gas for every payout) split by each heir's share, rounded down.
 * Throws if the balance does not even cover the gas.
 */
export function planPayouts(totalWei: bigint, maxFeePerGas: bigint, sharesBps: number[]): PayoutPlan {
  const n = BigInt(sharesBps.length)
  const feeTotal = TRANSFER_GAS_LIMIT * maxFeePerGas * n
  if (totalWei <= feeTotal) throw new Error('The vault balance does not cover the gas for the payouts.')
  const distributable = totalWei - feeTotal
  const amounts = sharesBps.map((bps) => (distributable * BigInt(bps)) / 10_000n)
  const paid = amounts.reduce((a, b) => a + b, 0n)
  return { feeTotal, distributable, amounts, dust: distributable - paid }
}

/** 1000000000000000000n -> "1.0" (ETH, trimmed). */
export function formatEth(wei: bigint, decimals = 6): string {
  const whole = wei / 10n ** 18n
  const frac = (wei % 10n ** 18n).toString().padStart(18, '0').slice(0, decimals)
  return `${whole}.${frac}`
}

/** Wei -> gwei for display. */
export function formatGwei(wei: bigint): string {
  const whole = wei / 1_000_000_000n
  const frac = (wei % 1_000_000_000n).toString().padStart(9, '0').slice(0, 2)
  return `${whole}.${frac}`
}
