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

The alerts run in a separate always-on service, [`../backend`](../backend) (deployed on Railway). People connect Telegram from the account window; `src/telegram/telegramApi.ts` signs the request with the person's NEAR key and calls the service.

The web app needs one setting for this: `VITE_PAL_API_URL`, the service's address (no trailing slash). When it is empty, as on localhost by default, the Telegram option is hidden. The bot token and database keys live only in the service, never here. `vercel.json` only sends every path to `index.html`, so vault links work on refresh.
