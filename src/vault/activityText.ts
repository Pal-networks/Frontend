import type { ActivityItem } from '../near/activity'

/** Each action in plain words. */
export function describeActivity(a: ActivityItem): { text: string; icon: string } {
  switch (a.method) {
    case 'create_vault':
      return { text: `Vault created as "${String(a.args.name ?? '')}"`, icon: 'add' }
    case 'rename_vault':
      return { text: `Vault renamed to "${String(a.args.name ?? '')}"`, icon: 'settings' }
    case 'check_in':
      return { text: 'Owner checked in', icon: 'check' }
    case 'set_guardians': {
      const n = Array.isArray(a.args.guardians) ? a.args.guardians.length : 0
      return { text: `Guardians updated (${n}, ${String(a.args.threshold ?? 0)} must agree)`, icon: 'shield' }
    }
    case 'reinvite_guardian':
      return { text: 'Guardian invited again', icon: 'shield' }
    case 'accept_guardianship':
      return { text: 'Guardian accepted the invitation', icon: 'shield' }
    case 'set_heirs':
      return { text: 'Heirs updated', icon: 'group' }
    case 'rename_heir':
      return { text: 'An heir was renamed', icon: 'group' }
    case 'update_heir_address':
      return { text: "An heir's address was changed", icon: 'group' }
    case 'approve_release':
      return { text: 'Guardian approved the release', icon: 'check' }
    case 'cancel_release':
      return { text: 'Owner cancelled the release', icon: 'close' }
    case 'reveal_heirs':
      return { text: 'Hidden heirs were revealed', icon: 'visibility_off' }
    case 'confirm_release':
      return { text: 'Guardian pressed Release funds', icon: 'send' }
    case 'start_execution':
      return { text: 'Release numbers were fixed', icon: 'lock' }
    case 'reset_execution':
      return { text: 'Release restarted after a failed payment', icon: 'refresh' }
    case 'restart_vault':
      return { text: 'Owner started the vault again', icon: 'refresh' }
    case 'sign_payout':
      return { text: 'A payment was signed', icon: 'send' }
    default:
      return { text: a.method.replace(/_/g, ' '), icon: 'info' }
  }
}

/** "just now", "5 min ago", "3 hours ago", "2 days ago". */
export function timeAgo(ms: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ms) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  const h = Math.floor(s / 3600)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}
