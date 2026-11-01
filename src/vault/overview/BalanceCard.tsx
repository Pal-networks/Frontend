import { useCallback, useEffect, useState } from 'react'
import { CopyButton } from '../../components/CopyButton'
import { Icon } from '../../components/Icon'
import { formatEth } from '../../eth/plan'
import { getEthBalance } from '../../eth/sepolia'
import { getVaultEthAddress } from '../../near/deriveAddress'
import { shortEth } from '../text'

const FAUCET_URL = 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia'

/** What the vault holds on Ethereum (Sepolia test network). */
export function BalanceCard({ vaultId }: { vaultId: number }) {
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const a = await getVaultEthAddress(vaultId)
      setAddress(a)
      setBalance(await getEthBalance(a))
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [vaultId])

  useEffect(() => {
    void load()
    const t = window.setInterval(() => void load(), 30000)
    return () => window.clearInterval(t)
  }, [load])

  // A press shows the skeleton. The automatic update every 30 seconds stays quiet.
  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <section className="card">
      <div className="row">
        <h2>Vault balance</h2>
        <button className="btn small" disabled={refreshing} onClick={() => void refresh()}>
          <Icon name="refresh" />
          Refresh
        </button>
      </div>

      {refreshing ? (
        <div className="skeleton sk-title" style={{ margin: 0 }} aria-busy="true" aria-label="Reading the balance" />
      ) : balance !== null ? (
        <p className="balance-amount">{formatEth(balance)} Sepolia ETH</p>
      ) : failed ? (
        <p className="hint">Could not read the balance right now. Press Refresh to try again.</p>
      ) : (
        <div className="skeleton sk-title" style={{ margin: 0 }} aria-busy="true" aria-label="Reading the balance" />
      )}

      {address && (
        <div className="row">
          <span className="hint" title={address}>
            Deposit address: {shortEth(address)}
          </span>
          <CopyButton text={address} />
        </div>
      )}

      <p className="hint">
        Need test ETH? Use the{' '}
        <a href={FAUCET_URL} target="_blank" rel="noreferrer">
          Sepolia faucet
        </a>{' '}
        and send it to the deposit address. Only send test ETH.
      </p>
    </section>
  )
}
