import { config } from '../config'
import { ethAddressFromDerivedKey } from './address'
import { provider } from './rpc'

/** The Sepolia (Ethereum) deposit address of one vault. Each vault gets its own. */
export async function getVaultEthAddress(vaultId: number): Promise<string> {
  const key = await provider.callFunction<string>({
    contractId: config.signerContract,
    method: 'derived_public_key',
    // The signer derives the key from the calling contract and this path.
    args: { path: `vault-${vaultId}`, predecessor: config.vaultAccount, domain_id: 0 },
  })
  return ethAddressFromDerivedKey(key as string)
}
