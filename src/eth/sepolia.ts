import { createPublicClient, http, type Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { config } from '../config'

// Sepolia is Ethereum's test network. With no VITE_SEPOLIA_RPC set, viem uses its
// built-in public address, which can be slow or rate-limited.
const client = createPublicClient({ chain: sepolia, transport: http(config.sepoliaRpc || undefined) })

export interface ChainFacts {
  balance: bigint
  nonce: number
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

const MIN_TIP = 100_000_000n // 0.1 gwei
const MIN_MAX_FEE = 1_000_000_000n // 1 gwei

/**
 * Fees are fixed once and cannot be changed, so a payment locked at a very low
 * fee could never confirm if fees rise. These are limits, not the price: the
 * network charges the going rate, and what is not used stays in the vault.
 */
function safeFees(estimatedMax: bigint, estimatedTip: bigint) {
  const tip = estimatedTip > MIN_TIP ? estimatedTip : MIN_TIP
  const doubled = estimatedMax * 2n
  const max = doubled > MIN_MAX_FEE ? doubled : MIN_MAX_FEE
  return { maxFeePerGas: max > tip ? max : tip, maxPriorityFeePerGas: tip }
}

/** What the release needs to know about the vault's address on Ethereum, read just now. */
export async function readChainFacts(address: string): Promise<ChainFacts> {
  const a = address as Hex
  const [balance, nonce, fees] = await Promise.all([
    client.getBalance({ address: a }),
    // "pending" so a payout already waiting in the network is counted.
    client.getTransactionCount({ address: a, blockTag: 'pending' }),
    client.estimateFeesPerGas(),
  ])
  return { balance, nonce, ...safeFees(fees.maxFeePerGas, fees.maxPriorityFeePerGas) }
}

/** The vault's balance on Sepolia, in wei. */
export const getEthBalance = (address: string) => client.getBalance({ address: address as Hex })

/** Sends a signed transaction to Ethereum. Returns its hash. This cannot be undone. */
export function broadcast(serialized: Hex): Promise<Hex> {
  return client.sendRawTransaction({ serializedTransaction: serialized })
}

/** Waits until Ethereum has processed a payment. A sent payment can still fail, so this is what counts. */
export async function paymentSucceeded(hash: Hex): Promise<boolean> {
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180_000 })
  return receipt.status === 'success'
}

export const explorerTx =(hash: string) => `https://sepolia.etherscan.io/tx/${hash}`
