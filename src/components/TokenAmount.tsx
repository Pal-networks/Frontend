/**
 * An amount of NEAR shown with the token logo instead of the word.
 * The logo file (public/near-logo.svg) is the NEAR symbol from NEAR's own
 * docs repository (github.com/near/docs, assets/favicon.svg). It is NEAR's
 * trademark: keep it unmodified and use it only to mean the NEAR token.
 */
export function TokenAmount({ value }: { value: string }) {
  return (
    <span className="token-amount" title="NEAR">
      <span className="token-icon" aria-hidden="true">
        <img src="/near-logo.svg" alt="" width="14" height="14" />
      </span>
      <span>{value}</span>
      <span className="sr-only">NEAR</span>
    </span>
  )
}
