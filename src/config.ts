// Reads the settings from .env.local. Testnet only: there is no mainnet option.

const env = import.meta.env as Record<string, string | undefined>

export const config = {
  privyAppId: env.VITE_PRIVY_APP_ID ?? '',
  privyClientId: env.VITE_PRIVY_APP_CLIENT_ID ?? '',
  network: 'testnet' as const,
  nearRpc: env.VITE_NEAR_RPC || 'https://test.rpc.fastnear.com',
  vaultAccount: env.VITE_VAULT_ACCOUNT ?? '',
  signerContract: env.VITE_SIGNER_CONTRACT || 'v1.signer-prod.testnet',
  sepoliaRpc: env.VITE_SEPOLIA_RPC ?? '',
  /** Pal's backend for Telegram alerts (the Railway service). Empty hides the Telegram option. */
  palApiUrl: (env.VITE_PAL_API_URL ?? '').replace(/\/+$/, ''),
}

/** Names of required settings that are empty, so the app can say what to fix. */
export function missingSettings(): string[] {
  const missing: string[] = []
  if (!config.privyAppId) missing.push('VITE_PRIVY_APP_ID')
  if (!config.privyClientId) missing.push('VITE_PRIVY_APP_CLIENT_ID')
  if (!config.vaultAccount) missing.push('VITE_VAULT_ACCOUNT')
  return missing
}
