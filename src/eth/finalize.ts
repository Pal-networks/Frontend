// Turns the MPC signer's answer into a signed Ethereum transaction, and checks
// who signed it. Pure maths, no network. Used by the release flow.
import { parseTransaction, recoverTransactionAddress, serializeTransaction, toHex, type Hex } from 'viem'

/** What the signer contract returns for a secp256k1 signature. */
export interface MpcSignature {
  big_r: { affine_point: string }
  s: { scalar: string }
  recovery_id: number
  scheme: string
}

/** Order of the secp256k1 curve. Ethereum only accepts signatures with s in the lower half. */
const CURVE_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

/**
 * unsignedHex: the unsigned EIP-1559 transaction bytes the contract built (hex, no 0x).
 * Returns the signed, ready-to-broadcast transaction.
 */
export function finalizeSignedTx(unsignedHex: string, sig: MpcSignature): Hex {
  if (sig.scheme !== 'Secp256k1') throw new Error('The signer used a different kind of signature than Ethereum needs.')
  const tx = parseTransaction(`0x${unsignedHex.replace(/^0x/, '')}`)

  // big_r is a compressed curve point: one prefix byte (02 or 03) then x. Ethereum's "r" is x.
  const point = sig.big_r.affine_point.replace(/^0x/, '')
  if (point.length !== 66) throw new Error('The signature has an unexpected shape.')
  const r = BigInt(`0x${point.slice(2)}`)

  let s = BigInt(`0x${sig.s.scalar.replace(/^0x/, '')}`)
  let yParity = sig.recovery_id
  if (s > CURVE_ORDER / 2n) {
    // Same signature, written the way Ethereum requires (flip s and the parity).
    s = CURVE_ORDER - s
    yParity = yParity ^ 1
  }
  if (yParity !== 0 && yParity !== 1) throw new Error('The signature has an unexpected recovery value.')

  return serializeTransaction(tx, { r: toHex(r, { size: 32 }), s: toHex(s, { size: 32 }), yParity })
}

/** The address that signed this transaction. Must equal the vault's address before broadcasting. */
export async function signerOf(serialized: Hex): Promise<string> {
  return recoverTransactionAddress({ serializedTransaction: serialized as `0x02${string}` })
}
