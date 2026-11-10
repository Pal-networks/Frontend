import { useState } from 'react'
import { useExportWallet } from '@privy-io/react-auth/extended-chains'
import { useAuth } from '../auth/context'
import { shortAccount } from '../vault/text'
import { CopyButton } from './CopyButton'
import { Icon } from './Icon'
import { ErrorLine, InfoLine } from './Messages'
import { Modal } from './Modal'
import { TelegramAlerts } from './TelegramAlerts'
import { TokenAmount } from './TokenAmount'

/** The account button in the header, and the modal it opens. */
export function AccountMenu() {
  const auth = useAuth()
  const { exportWallet } = useExportWallet()
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  if (!auth.accountId) return null
  const accountId = auth.accountId
  const funded = auth.balance?.exists && auth.balance.near !== '0.0000'

  const refresh = async () => {
    setRefreshing(true)
    await auth.refreshBalance()
    setRefreshing(false)
  }

  const show = () => {
    setOpen(true)
    void refresh()
  }

  return (
    <>
      <button className="account-btn" onClick={show} aria-haspopup="dialog">
        <Icon name="account_circle" />
        <span>{shortAccount(accountId)}</span>
      </button>

      {open && (
        <Modal title="Your account" subtitle={auth.email ?? undefined} onClose={() => setOpen(false)} className="modal-glow">
          {auth.error && <ErrorLine message={auth.error} />}

          <div className="field">
            <span className="label">Your NEAR account</span>
            <div className="row">
              <code className="mono" title={accountId}>
                {accountId}
              </code>
              <CopyButton text={accountId} />
            </div>
          </div>

          <div className="field">
            <span className="label">Test balance</span>
            <div className="row">
              {auth.balance && !refreshing ? (
                <TokenAmount value={auth.balance.near} />
              ) : (
                <div className="skeleton sk-line" style={{ width: '40%' }} aria-busy="true" aria-label="Checking balance" />
              )}
              <button className="btn small" disabled={refreshing} onClick={() => void refresh()}>
                <Icon name="refresh" />
                Refresh
              </button>
            </div>
          </div>

          {!funded && auth.balance && (
            <InfoLine>
              This account has no test NEAR yet, so it cannot do anything on the network. Send test NEAR to the account above from another testnet account, then press Refresh. The website faucet does not accept this kind of account.
            </InfoLine>
          )}

          <TelegramAlerts accountId={accountId} />

          <button
            className="btn"
            onClick={async () => {
              setOpen(false)
              try {
                await exportWallet({ address: accountId })
              } catch (e) {
                console.error('[pal] key export failed', e)
              }
            }}
          >
            <Icon name="key" />
            Export my private key
          </button>

          <button
            className="btn"
            onClick={async () => {
              setOpen(false)
              await auth.logOut()
            }}
          >
            <Icon name="logout" />
            Sign out
          </button>
        </Modal>
      )}
    </>
  )
}
