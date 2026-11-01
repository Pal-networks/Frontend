import { useEffect, useState } from 'react'
import { friendlyError } from '../auth/errors'
import { CopyButton } from '../components/CopyButton'
import { HeirCards } from '../components/HeirCards'
import { Icon } from '../components/Icon'
import { ErrorLine } from '../components/Messages'
import { getVaultEthAddress } from '../near/deriveAddress'
import type { HeirCard } from './logic'

/** Shown after the vault exists: its number, its Ethereum address, and any heir cards. */
export function Done({ vaultId, name, cards, onFinish }: { vaultId: number; name: string; cards: HeirCard[]; onFinish: () => void }) {
  const [address, setAddress] = useState<string | null>(null)
  const [addrError, setAddrError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getVaultEthAddress(vaultId)
      .then((a) => !cancelled && setAddress(a))
      .catch((e) => !cancelled && setAddrError(friendlyError(e)))
    return () => {
      cancelled = true
    }
  }, [vaultId])

  return (
    <section className="card wide-card">
      <div>
        <h1>Your vault is ready</h1>
        <p className="lead">
          “{name}” is vault number {vaultId}.
        </p>
      </div>

      <div className="field">
        <span className="label">Ethereum deposit address (Sepolia test network)</span>
        {address ? (
          <div className="row">
            <code className="mono" title={address}>
              {address}
            </code>
            <CopyButton text={address} />
          </div>
        ) : addrError ? (
          <ErrorLine message={`Could not work out the address yet. ${addrError}`} />
        ) : (
          <div className="skeleton sk-box" aria-busy="true" aria-label="Working out the address" />
        )}
        <p className="hint">Send Sepolia test ETH here when you want the vault to hold something. The ETH stays on Ethereum, not inside the NEAR contract. Only send test ETH to this address.</p>
      </div>

      {cards.length > 0 && <HeirCards cards={cards} vaultId={vaultId} name={name} />}

      <button className="btn primary" onClick={onFinish}>
        <Icon name="arrow_forward" />
        Go to my vaults
      </button>
    </section>
  )
}
