/** Turns "... Smart contract panicked: <text> ..." into just the contract's own text. */
export function plainContractError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e)
  const m = msg.match(/panicked:\s*([^\n"]+)/i)
  return new Error(m ? m[1].trim() : msg)
}
