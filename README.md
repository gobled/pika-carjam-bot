This is a [Next.js](https://nextjs.org) Telegram Mini App project for **Pika CarJam**, a kid-friendly parking puzzle game inspired by Car Jam / escape-style puzzle games.

The current codebase keeps the existing Next.js app plus Telegram webhook integration while the product direction shifts toward a colorful, touch-first puzzle game for ages 6-12. For the MVP, the app will use the current in-app API routes and Telegram integration instead of a separate backend service.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Telegram Bot Token (get it from [@BotFather](https://t.me/BotFather))
- ngrok or similar tunneling service for local development

### Environment Setup

1. Create a `.env.local` file in the root directory:

```env
BOT_TOKEN=your_bot_token_here
WEBAPP_URL=https://your-ngrok-url.ngrok.io
NEXT_PUBLIC_BOT_USERNAME=your_bot_username_here
```

2. Install dependencies:

```bash
pnpm install
```

### Developing Telegram Mini Apps Locally

Developing Telegram Mini Apps requires your app to be accessible via HTTPS. Here's how to set up your local development environment:

#### Step 1: Start the Next.js Development Server

```bash
pnpm dev
```

Your app will be available at [http://localhost:3000](http://localhost:3000).

#### Step 2: Expose Your Local Server with ngrok

Since Telegram requires HTTPS URLs for Mini Apps, you need to expose your local server:

1. Install [ngrok](https://ngrok.com/download) or use an alternative like [localtunnel](https://localtunnel.github.io/www/)

2. Run ngrok to create a tunnel to your local server:

```bash
ngrok http 3000
```

3. Copy the HTTPS URL provided by ngrok (e.g., `https://abc123.ngrok.io`)

4. Update your `.env.local` file with the ngrok URL:

```env
WEBAPP_URL=https://abc123.ngrok.io
```

#### Step 3: Configure the Telegram Webhook

In the current repo, Telegram bot updates are handled by the Next.js route at `app/api/webhook/route.ts`, so there is no separate bot process to start for local development.

Once your app is running through ngrok, point your Telegram bot webhook to:

```bash
https://your-ngrok-url.ngrok.io/api/webhook
```

#### Step 4: Test Your Mini App

1. Open Telegram and find your bot
2. Send the `/start` command
3. Click the "Open" button to launch your Mini App
4. The Mini App should open with your local development server

#### Development Tips

- **Hot Reload**: The Next.js dev server supports hot reload. Changes to your code will automatically reflect in the Mini App.
- **ngrok URL Changes**: Each time you restart ngrok, you'll get a new URL. Update your `.env.local` file and reconfigure the Telegram webhook when this happens.
- **Debugging**: Use browser DevTools in Telegram Desktop or the Telegram Web version for easier debugging.
- **Testing on Mobile**: The ngrok URL works on mobile devices too, so you can test on actual Telegram mobile apps.
- **Webhook Route**: Bot commands are currently handled by `app/api/webhook/route.ts`.

#### Alternative: Using a Fixed Tunnel URL

For a more stable development experience, consider:
- ngrok paid plans (provides fixed URLs)
- [localhost.run](https://localhost.run/) (free, but URLs change)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (free, fixed URLs)

## Telegram Bot Capabilities

- Handles `/start` and opens the Mini App with Telegram `startapp` data encoded from the current chat.
- Supports `/webapp` as a direct way to reopen the game from chat.
- Processes bot updates through `app/api/webhook/route.ts`.
- Includes referral tracking support through local API routes under `app/api/referrals`.
- Keeps a health-checkable webhook endpoint at `GET /api/webhook`.

From a product perspective, this bot is being adapted to launch the Pika CarJam game experience inside Telegram. The intended gameplay is a short-session parking puzzle where players slide vehicles, clear a path for the target car, retry quickly, and progress through simple mobile-friendly levels.

### Project Structure

- `/app` - Next.js app directory (Mini App frontend)
- `app/components/CarJam.tsx` - Main gameplay entry component
- `app/api/webhook/route.ts` - Telegram webhook entry point and bot command handlers
- `app/api/referrals/claim/route.ts` - Claim referral rewards
- `app/api/referrals/[userId]/route.ts` - Fetch referral progress for a user
- `app/lib/telegram.ts` - Telegram Web App access helper
- `app/lib/referralStorage.ts` - Local referral storage used by the API routes

### Available Commands

**Frontend (Mini App):**
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

Bot command handling currently runs through the Next.js webhook route in `app/api/webhook/route.ts`.

### Bot Commands

- `/start` - Initialize the bot and display the Mini App button
- `/webapp` - Open the Mini App

You can start editing the game experience by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
