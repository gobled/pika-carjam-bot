# Pika CarJam

Pika CarJam is a Next.js Telegram Mini App that is being reshaped into a kid-friendly parking puzzle MVP. Phase 1 focuses on a stable app shell that can boot safely inside Telegram while also remaining usable in a normal desktop or mobile browser during local development.

## What Phase 1 delivers

- A Telegram bootstrap helper that detects whether the app is running inside Telegram or a standard browser.
- A typed session model that normalizes launch parameters into a single shape for the UI.
- Progressive enhancement for Telegram-only APIs such as `expand`, fullscreen requests, closing confirmation, and orientation locking.
- A lightweight loading state and shell-level fallback UI when Telegram session data is unavailable.
- Top-level MVP shell states for home, level select, gameplay, victory modal, daily reward modal, settings, and leaderboard.

## Prerequisites

- Node.js 18+
- pnpm
- A Telegram bot token if you want to run the bot/webhook flow
- An HTTPS tunnel such as ngrok or Cloudflare Tunnel if you want to load the Mini App from Telegram during local development

## Environment variables

Create `.env.local` in the repository root when you need Telegram bot features:

```env
BOT_TOKEN=your_bot_token_here
WEBAPP_URL=https://your-public-tunnel-url.example
NEXT_PUBLIC_BOT_USERNAME=your_bot_username_without_the_at
```

### Variable notes

- `BOT_TOKEN`: required for Telegram bot webhook and command handling.
- `WEBAPP_URL`: public HTTPS URL used by the bot to open the Mini App.
- `NEXT_PUBLIC_BOT_USERNAME`: optional for the Phase 1 shell itself, but required if you want any share/deep-link UI to generate Telegram bot links in future phases.

## Local development

### Browser-only shell preview

If you only want to work on the app shell locally, you can run the frontend without Telegram:

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`. The app will detect that Telegram is unavailable and fall back to a local browser session model.

### Telegram Mini App preview

To test the same app inside Telegram:

1. Start the Next.js dev server.
2. Expose it through HTTPS with a tunnel.
3. Put the public tunnel URL into `WEBAPP_URL`.
4. Start the bot.
5. Open the bot inside Telegram and launch the Mini App.

Example commands:

```bash
pnpm dev
ngrok http 3000
pnpm bot:dev
```

## Useful scripts

- `pnpm dev` — start the Next.js dev server.
- `pnpm build` — build the Next.js app.
- `pnpm start` — run the production build.
- `pnpm bot:dev` — run the Telegram bot in development mode.
- `pnpm bot:build` — compile the bot TypeScript project.
- `pnpm bot:start` — start the compiled bot.

## Current project structure

- `app/page.tsx` — top-level shell states and screen transitions.
- `app/components/CarJam.tsx` — isolated gameplay shell placeholder.
- `app/lib/telegram.ts` — Telegram detection, bootstrap, and typed session helpers.
- `app/lib/useTelegramBootstrap.ts` — client hook for loading Telegram/session state.
- `app/api/webhook/route.ts` — Telegram webhook endpoint.
- `app/api/referrals/[userId]/route.ts` and `app/api/referrals/claim/route.ts` — existing referral endpoints retained for future API cleanup.

## Notes

- Telegram-specific APIs are treated as optional so the app stays stable when previewed in a regular browser.
- The current gameplay screen is intentionally a shell so Phase 2 can replace it with a deterministic puzzle engine.
