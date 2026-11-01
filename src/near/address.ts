// Turns the MPC signer's derived public key into the vault's Ethereum address.
// Pure maths, no network. The signer returns "secp256k1:<base58 of 64 bytes>";
// the Ethereum address is the last 20 bytes of the Keccak-256 hash of those bytes.
import { getAddress, keccak256 } from 'viem'

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function base58Decode(input: string): Uint8Array {
  let n = 0n
  for (const ch of input) {
    const i = ALPHABET.indexOf(ch)
    if (i < 0) throw new Error(`Unexpected character "${ch}" in a base58 key`)
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

/** "secp256k1:…" -> checksummed Ethereum address. */
export function ethAddressFromDerivedKey(key: string): string {
  const [scheme, b58] = key.split(':')
  if (scheme !== 'secp256k1' || !b58) throw new Error('The signer returned a key that is not secp256k1.')
  const bytes = base58Decode(b58)
  if (bytes.length !== 64) throw new Error(`Unexpected key length ${bytes.length}; expected 64 bytes.`)
  const hash = keccak256(bytes)
  return getAddress(`0x${hash.slice(-40)}`)
}
