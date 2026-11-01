import { useState } from 'react'
import { ErrorLine } from '../../components/Messages'
import { sendVaultCall, type Rules } from '../../near/vaultApi'
import { commitment, parseBps } from '../../wizard/logic'
import { useAction } from '../hooks'

/** Hidden heirs: anyone holding the secret codes can reveal them once a release is under way. */
export function RevealHeirs({ rules, reload }: { rules: Rules; reload: () => Promise<void> }) {
  const { busy, error, run } = useAction(reload)
  const [rows, setRows] = useState(() => rules.heir_commitments.map(() => ({ address: '', percent: '', code: '' })))
  const [problem, setProblem] = useState<string | null>(null)
  const set = (i: number, p: Partial<(typeof rows)[number]>) => setRows(rows.map((x, j) => (j === i ? { ...x, ...p } : x)))

  const submit = async () => {
    setProblem(null)
    const heirs: { eth_address: string; bps: number; salt: string; label: string }[] = []
    for (const [i, r] of rows.entries()) {
      const bps = parseBps(r.percent)
      if (!/^0x[0-9a-fA-F]{40}$/.test(r.address.trim()) || bps === null || !r.code.trim()) {
        return setProblem(`Heir ${i + 1}: fill in the address, the share and the secret code.`)
      }
      const eth = r.address.trim().toLowerCase()
      const c = await commitment(eth, bps, r.code.trim())
      if (!rules.heir_commitments.includes(c)) {
        return setProblem(`Heir ${i + 1}: these details do not match what the owner saved. Check the address, share and code.`)
      }
      heirs.push({ eth_address: eth, bps, salt: r.code.trim(), label: '' })
    }
    await run('reveal', () => sendVaultCall('reveal_heirs', { vault_id: rules.vault_id, heirs }), 'Heirs revealed.')
  }

  return (
    <div className="stack">
      <h3>Reveal the heirs</h3>
      <p className="hint">The heirs are hidden. Enter each heir's details and their secret code. A wrong code is caught here, before anything is sent.</p>
      {rows.map((r, i) => (
        <div className="heir-row reveal-row" key={i}>
          <label className="field">
            <span className="label">Ethereum address</span>
            <input className="input mono-input" value={r.address} onChange={(e) => set(i, { address: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Share %</span>
            <input className="input" value={r.percent} onChange={(e) => set(i, { percent: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Secret code</span>
            <input className="input mono-input" value={r.code} onChange={(e) => set(i, { code: e.target.value })} />
          </label>
        </div>
      ))}
      {(problem || error) && <ErrorLine message={(problem ?? error) as string} />}
      <button className="btn primary" disabled={!!busy} onClick={submit}>
        {busy === 'reveal' ? 'Revealing…' : 'Reveal heirs'}
      </button>
    </div>
  )
}
