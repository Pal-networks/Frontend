import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * A pop-over panel. Esc, the close button and a click outside all close it,
 * unless `locked` is set (while saving, or while secret codes are on screen).
 */
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  locked = false,
  wide = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  locked?: boolean
  wide?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])

  const tryClose = () => {
    if (!locked) onClose()
  }

  return (
    <dialog
      ref={dialog}
      className={wide ? 'modal wide' : 'modal'}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault() // the app decides whether it closes
        tryClose()
      }}
      onClick={(e) => {
        // A click on the dark area outside lands on the dialog element itself,
        // but so does a click on its padding, so compare with the panel's edges.
        if (e.target !== dialog.current) return
        const box = dialog.current.getBoundingClientRect()
        const inside = e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom
        if (!inside) tryClose()
      }}
    >
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="hint">{subtitle}</p>}
        </div>
        {!locked && (
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        )}
      </div>
      {children}
    </dialog>
  )
}
