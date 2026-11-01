import { formatSpan } from '../../wizard/logic'
import { BalanceCard } from '../overview/BalanceCard'
import { GuardianActions } from '../overview/GuardianActions'
import { OwnerActions } from '../overview/OwnerActions'
import { StatusCard } from '../overview/StatusCard'
import { shortAccount } from '../text'
import { ReleaseCard } from '../release/ReleaseCard'
import type { VaultContext } from '../types'

export function OverviewSection(props: VaultContext & { accountId: string | null }) {
  const { rules, status, isOwner, accountId } = props
  const isGuardian = !!accountId && rules.guardians.includes(accountId)
  const canRelease = isOwner || isGuardian
  return (
    <>
      <div className="two-cards">
        <StatusCard rules={rules} status={status} />
        <BalanceCard vaultId={rules.vault_id} />
      </div>
      {status.phase === 'executable' && canRelease && <ReleaseCard rules={rules} status={status} reload={props.reload} isOwner={isOwner} />}
      {isOwner && status.phase !== 'executable' && <OwnerActions {...props} />}
      {accountId && !isOwner && status.phase !== 'executable' && <GuardianActions {...props} accountId={accountId} />}
      <section className="card">
        <h2>The rules</h2>
        <p className="hint">These are stored on the blockchain.</p>
        <dl className="facts">
          <div>
            <dt>Owner</dt>
            <dd title={rules.owner}>{shortAccount(rules.owner)}</dd>
          </div>
          <div>
            <dt>Check in every</dt>
            <dd>{formatSpan(rules.check_in_interval)}</dd>
          </div>
          <div>
            <dt>Guardians may act after silence of</dt>
            <dd>{formatSpan(rules.silence_period)}</dd>
          </div>
          <div>
            <dt>Waiting period after approval</dt>
            <dd>{formatSpan(rules.waiting_period)}</dd>
          </div>
        </dl>
      </section>
    </>
  )
}
