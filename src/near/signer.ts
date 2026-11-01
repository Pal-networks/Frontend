// Signs NEAR transactions with the Privy wallet (NEAR docs, Privy tutorial, "Direct Privy").
// near-api-js builds, serialises and hashes the transaction. Privy only signs the hash.
import { PublicKey, Signer } from 'near-api-js'
import { bytesToHex, hexToBytes } from 'viem'

/** Privy's raw signing call, from useSignRawHash(). */
export type SignRawHash = (input: {
  address: string
  chainType: 'near'
  hash: `0x${string}`
}) => Promise<{ signature: `0x${string}` }>

/** Privy wallets are implicit accounts: the account ID is the public key in hex. */
export class PrivySigner extends Signer {
  signRawHash: SignRawHash
  accountId: string

  constructor(signRawHash: SignRawHash, accountId: string) {
    super()
    this.signRawHash = signRawHash
    this.accountId = accountId
  }

  async getPublicKey(): Promise<PublicKey> {
    if (!/^[0-9a-f]{64}$/.test(this.accountId)) throw new Error('This is not a Privy NEAR account.')
    return new PublicKey({ keyType: 0, data: hexToBytes(`0x${this.accountId}`) })
  }

  protected async signBytes(bytes: Uint8Array): Promise<Uint8Array> {
    const { signature } = await this.signRawHash({
      address: this.accountId,
      chainType: 'near',
      hash: bytesToHex(bytes),
    })
    return hexToBytes(signature)
  }
}
