import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'

/**
 * Signing has no pop-up, so important actions open a modal first.
 * The button shows what will happen; "confirm" in the modal does it.
 */
export function ConfirmButton({
  children,
  title = 'Please confirm',
  question,
  confirmLabel,
  onConfirm,
  disabled,
  className = 'btn primary',
}: {
  children: ReactNode
  title?: string
  question: string
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
  className?: string
}) {
  const [asking, setAsking] = useState(false)

  return (
    <>
      <button className={className} disabled={disabled} onClick={() => setAsking(true)}>
        {children}
      </button>
      {asking && (
        <Modal title={title} onClose={() => setAsking(false)}>
          <p>{question}</p>
          <div className="wizard-nav">
            <button className="btn" onClick={() => setAsking(false)}>
              Go back
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setAsking(false)
                onConfirm()
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
