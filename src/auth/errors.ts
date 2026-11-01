/** Turns technical errors into plain sentences for the owner. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/exited_auth_flow|user rejected/i.test(msg)) return 'Sign-in was cancelled.'
  // NEAR takes the gas up front and returns what is not used, so an action can need more than it costs.
  if (/not enough balance for/i.test(msg)) {
    return 'This account does not have enough test NEAR for this step. It needs about 0.35 NEAR available. Most of it comes back afterwards. Add test NEAR and try again.'
  }
  if (/failed to fetch|network ?error/i.test(msg)) return 'Could not reach the network. Check your internet connection and try again.'
  return msg || 'Something went wrong. Please try again.'
}
