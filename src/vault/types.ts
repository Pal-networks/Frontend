import type { Rules, Status } from '../near/vaultApi'

/** What every section of the vault page receives. */
export interface VaultContext {
  rules: Rules
  status: Status
  reload: () => Promise<void>
  isOwner: boolean
}

/** Guardians and heirs are locked in these phases. */
export const RELEASE_UNDER_WAY = ['pending_approval', 'countdown', 'executable']
