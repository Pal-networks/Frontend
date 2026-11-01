import type { HeirCard } from '../wizard/logic'
import { CopyButton } from './CopyButton'
import { Icon } from './Icon'
import { ErrorLine } from './Messages'

const cardText = (c: HeirCard) => `${c.name || 'Heir'}\nAddress: ${c.address}\nShare: ${c.percent}%\nSecret code: ${c.salt}`

/** The secret-code cards for hidden heirs, with a strong warning to save them. */
export function HeirCards({ cards, vaultId, name }: { cards: HeirCard[]; vaultId: number; name: string }) {
  const allText = `Pal vault "${name}" (number ${vaultId}): heir secret codes\n\n${cards.map(cardText).join('\n\n')}\n`

  const download = () => {
    const url = URL.createObjectURL(new Blob([allText], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `pal-vault-${vaultId}-heir-codes.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="stack">
      <ErrorLine message="Save these secret codes now. They are shown only once and are not stored anywhere. If a code is lost, that heir cannot be revealed later. Give each heir only their own code." />
      {cards.map((c) => (
        <div className="heir-card" key={c.salt}>
          <div>
            <strong>{c.name || 'Heir'}</strong> · {c.percent}%
          </div>
          <code className="mono">{c.address}</code>
          <div className="row">
            <code className="mono" title="Secret code">
              {c.salt}
            </code>
            <CopyButton text={cardText(c)} />
          </div>
        </div>
      ))}
      <button className="btn" onClick={download}>
        <Icon name="download" />
        Download codes
      </button>
      <p className="hint">The file is plain text. Keep it somewhere safe, and delete it from your Downloads folder once it is stored.</p>
    </div>
  )
}
