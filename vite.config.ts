import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Privy docs (troubleshooting > Vite > "process is not defined"): one of
    // Privy's dependencies expects Node's `process`, which browsers do not have.
    nodePolyfills(),
  ],
})
