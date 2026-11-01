import { useEffect, useState } from 'react'
import { CopyButton } from '../../components/CopyButton'
import { InfoLine } from '../../components/Messages'
import { getVaultEthAddress } from '../../near/deriveAddress'
import type { Rules } from '../../near/vaultApi'

export function DepositSection({ rules }: { rules: Rules }) {
  const [address, setAddress] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getVaultEthAddress(rules.vault_id)
      .then((a) => !cancelled && setAddress(a))
      .catch(() => !cancelled && setAddress(''))
    return () => {
      cancelled = true
    }
  }, [rules.vault_id])

  return (
    <section className="card">
      <h2>Deposit</h2>
      <div className="field">
        <span className="label">Ethereum deposit address (Sepolia test network)</span>
        {address === null ? (
          <div className="skeleton sk-box" aria-busy="true" aria-label="Working out the address" />
        ) : address === '' ? (
          <p className="hint">Could not work out the address right now.</p>
        ) : (
          <div className="row">
            <code className="mono" title={address}>
              {address}
            </code>
            <CopyButton text={address} />
          </div>
        )}
      </div>
      <InfoLine>Anyone can send Sepolia test ETH here. The ETH stays on Ethereum, not in the NEAR contract, and the vault pays its heirs from this address. Only send test ETH.</InfoLine>
    </section>
  )
}
