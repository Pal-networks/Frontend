import { JsonRpcProvider } from 'near-api-js'
import { config } from '../config'

// NEAR Connect has no read-only calls, so reads go straight to the RPC.
export const provider = new JsonRpcProvider({ url: config.nearRpc })

const YOCTO = 10n ** 24n

/** "1234500000000000000000000" yoctoNEAR -> "1.2345" NEAR. */
export function formatNear(yocto: string | bigint, decimals = 4): string {
  const v = typeof yocto === 'bigint' ? yocto : BigInt(yocto)
  const whole = v / YOCTO
  const frac = (v % YOCTO).toString().padStart(24, '0').slice(0, decimals)
  return `${whole}.${frac}`
}

/**
 * Spendable-looking balance in NEAR, or null if the account does not exist yet
 * (a brand new login has no balance until someone sends it NEAR).
 */
export async function getBalance(accountId: string): Promise<{ exists: boolean; near: string; yocto: bigint }> {
  try {
    const acct = await provider.viewAccount({ accountId })
    const yocto = BigInt(acct.amount)
    return { exists: true, near: formatNear(yocto), yocto }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/does not exist|UnknownAccount/i.test(msg)) return { exists: false, near: '0.0000', yocto: 0n }
    throw e
  }
}
