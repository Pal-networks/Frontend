import { useState } from 'react'
import { Icon } from './Icon'

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="btn small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* clipboard blocked: the text is still on screen to copy by hand */
        }
      }}
    >
      <Icon name={done ? 'check' : 'content_copy'} />
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}
