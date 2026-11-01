import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function ErrorLine({ message }: { message: string }) {
  return (
    <p className="alert" role="alert">
      <Icon name="error" />
      <span>{message}</span>
    </p>
  )
}

export function InfoLine({ icon = 'info', children }: { icon?: string; children: ReactNode }) {
  return (
    <p className="note">
      <Icon name={icon} />
      <span>{children}</span>
    </p>
  )
}

export function SuccessLine({ message }: { message: string }) {
  return <InfoLine icon="check">{message}</InfoLine>
}

/** Says why something is not available right now. */
export function Reason({ children }: { children: ReactNode }) {
  return (
    <p className="hint reason">
      <Icon name="info" /> {children}
    </p>
  )
}
