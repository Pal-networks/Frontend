# Pal web app

Vite + React + TypeScript. Testnet only (NEAR testnet and Ethereum Sepolia).

```powershell
npm install
# copy .env.example to .env.local and fill in the Privy App ID and Client ID
npm run dev      # http://localhost:5173
npm run build    # type-check and production build
```

- `src/auth/` Privy login (email, Google) and the person's NEAR account. Follows the "Direct Privy" route in the NEAR docs: there is no pop-up, so `ConfirmButton` asks for a second click on important actions.
- `src/pages/` the top-level screens. `App.tsx` only chooses which one to show.
- `src/components/` shared pieces: `Shell`, `Modal`, `Messages`, `ConfirmButton`, `AccountMenu`, `HeirCards`.
- `src/wizard/` the "new vault" wizard, one file per step in `steps/`. `logic.ts` holds the rules and has no UI code, so it can be tested alone.
- `src/vault/` the vault page and sidebar: `sections/` (one file per sidebar item), `overview/`, `edit/` (the heirs and guardians modals), `release/` (the release steps).
- `src/styles/` the stylesheet, split by area. `index.css` imports them in order; the order matters.
- `src/near/` reads and calls against the contract, and `signer.ts`, which signs with Privy. `src/eth/` payout maths, signature checking, Sepolia reads.
- Settings live in `.env.local` (git-ignored). Never put the Privy App Secret there: anything starting with `VITE_` is readable in the browser.

Style: white, clean, light purple. No bold text, no shadows, small corners, Google Material Symbols icons, skeleton loaders. See `src/index.css` for the design tokens.

See `../inheritance-vault/README.md` for what is verified and what is not.

## Telegram alerts

`api/index.ts` is a small Vercel Function (one file, every `/api` path; `vercel.json` routes them to it). People connect Telegram from the account window. A free outside scheduler calls `/api/notify` every minute, and the bot messages:

- the owner when a check-in is due, when guardians can start a release, and when the countdown starts;
- guardians when they can approve, and when the countdown ends and they must press Release funds;
- everyone when the heirs have been paid. Each alert is sent once per round.

Linking is signed with the person's NEAR key: a Privy account's ID is its public key, so the server checks the signature without any Privy secret. The bot's link codes last 15 minutes and work once.

Vercel environment variables (Secret type, never `VITE_`): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`. Config type: `TELEGRAM_BOT_USERNAME`, and optionally `PAL_APP_URL` (otherwise the production address is used in messages). Upstash Redis from the Vercel Marketplace adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` pair). The function also reads the existing `VITE_VAULT_ACCOUNT`, `VITE_NEAR_RPC`, `VITE_SIGNER_CONTRACT` and `VITE_SEPOLIA_RPC`.

After deploying, point the bot at the site once (`POST /api/telegram/setup` with `Authorization: Bearer <CRON_SECRET>`), then have the scheduler call `GET /api/notify` every minute with the same header. `npm run dev` has no backend, so the Telegram option is hidden on localhost.
