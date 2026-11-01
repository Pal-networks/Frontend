import { useState } from 'react'
import { Icon } from './Icon'
import { Modal } from './Modal'

const STEPS = [
  { title: 'Create a vault', text: 'Give it a name, then add the heirs and how much each one receives. Add guardians you trust.' },
  { title: 'Add funds', text: 'Each vault has its own Ethereum address. The ETH stays on Ethereum.' },
  { title: 'Check in', text: 'The owner checks in now and then. As long as they do, nothing happens.' },
  { title: 'If the owner goes silent', text: 'After the silence period, guardians can approve a release. When enough agree, a countdown starts.' },
  { title: 'The owner can still stop it', text: 'Until the countdown ends, the owner can cancel. After that, it cannot be stopped.' },
  { title: 'Release', text: 'A guardian presses Release funds, and the heirs receive their shares.' },
]

/** The question mark in the header, and the explainer it opens. */
export function HelpMenu() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="icon-btn help-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="How Pal works" title="How Pal works">
        <Icon name="help" />
      </button>

      {open && (
        <Modal title="How Pal works" subtitle="Pass on what you own if something happens to you." onClose={() => setOpen(false)} wide>
          <div className="help-section">
            <h3>The problem</h3>
            <p>When someone who holds crypto dies or can no longer act, their funds are often lost for good, because only their private key can move them. Sharing the key early means trusting someone with everything today. Using a company or a lawyer means trusting them to hold it.</p>
          </div>

          <div className="help-section">
            <h3>What Pal does</h3>
            <p>You keep control while you are around. If you go silent, people you trust can start a release, and your funds go only to the heirs you chose. Nobody ever needs your private key.</p>
          </div>

          <ol className="help-steps">
            {STEPS.map((s) => (
              <li key={s.title}>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>

          <div className="help-section">
            <h3>Guardians decide when, never who</h3>
            <p>The heirs and their shares are stored in the contract. A guardian can start a release, but cannot change who receives the money or how much.</p>
          </div>

          <div className="help-section">
            <h3>How a NEAR contract controls Ethereum</h3>
            <p>There is no contract on Ethereum and no bridge. The vault's Ethereum address is controlled by a NEAR contract through NEAR Chain Signatures. The contract builds each payment and asks NEAR's MPC network to sign it. Ethereum then sees a normal transaction from the vault's address.</p>
          </div>

          <div className="help-section">
            <h3>This is a test version</h3>
            <p>It runs on NEAR testnet and Ethereum Sepolia, with test tokens only. Never send real money to a vault.</p>
          </div>

          <button className="btn primary" onClick={() => setOpen(false)}>
            Got it
          </button>
        </Modal>
      )}
    </>
  )
}
