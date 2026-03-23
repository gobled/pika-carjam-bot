# Quickstart: Playable Puzzle Level

## Prerequisites

- Node.js 18+
- `pnpm install` completed
- Telegram bot environment configured if you want to validate inside Telegram
- Optional HTTPS tunnel such as `ngrok` for Mini App testing

## Run locally

1. From `C:\Projects\Personal\pika-workspace\pika-carjam-bot`, start the app:

   ```powershell
   pnpm dev
   ```

2. Open the local URL printed by Next.js in a browser for non-Telegram fallback validation. This is typically `http://localhost:3000`, but it may move to the next available port if `3000` is already in use.

3. For Telegram Mini App validation, expose the app over HTTPS:

   ```powershell
   ngrok http 3000
   ```

4. Point the bot webhook and Mini App URL to the HTTPS tunnel as described in `README.md`.

## Build and lint verification

Run these checks before feature sign-off:

```powershell
pnpm build
pnpm lint
```

If `pnpm lint` exposes pre-existing repo issues outside this feature, document them and still require the gameplay changes themselves to be clean.

## Manual validation flow

### Story 1: Clear matching vehicles

1. Launch the game from the home screen.
2. Confirm the board, passenger queue, and 3-slot dock are visible.
3. Verify the front passenger is `red`, then tap a blocked vehicle such as the purple vehicle on the bottom row and verify:
    - it does not move
    - the queue does not change
    - the UI communicates that the move was invalid
4. Tap the clear red vehicle on the top row and verify:
    - the vehicle leaves active play
    - exactly one passenger is removed from the front of the queue
    - the next required passenger becomes visible
    - the feedback changes from blocked or ready messaging to successful-exit confirmation

### Story 2: Use the dock strategically

1. Tap an unblocked vehicle whose color does not match the next passenger.
2. Verify the vehicle moves into the next open dock slot, the dock occupancy count increases, and the queue remains unchanged.
3. While that docked vehicle is still not the next match, tap it and verify:
   - it stays in the dock
   - the queue remains unchanged
   - the UI communicates that the dock tap is invalid for the current passenger
4. Progress the queue until that docked vehicle becomes the correct next color.
5. Verify the docked vehicle does not resolve automatically when it becomes the next match.
6. Tap that docked vehicle and verify:
   - it resolves from the dock only on tap
   - exactly one passenger is removed from the front of the queue
   - the dock slot becomes empty again

### Story 3: Reach a clear end state

1. Play a winning run by resolving the full passenger queue and verify:
    - the queue becomes empty
    - a distinct win overlay appears with restart and exit actions
    - normal move input is locked
    - the queue and dock surfaces show the completed attempt state
2. Play a dock-full losing run by sending three non-matching clear vehicles into the dock, then tapping another clear non-matching vehicle, and verify:
    - a distinct loss overlay appears immediately
    - the loss messaging makes it clear the dock filled up
    - normal move input is locked
    - the queue and dock surfaces remain frozen until restart or exit
3. Play a no-legal-move losing run by reaching a state where no clear parking move or matching dock tap can advance the queue and verify:
    - a distinct loss overlay appears immediately
    - the loss messaging makes it clear there is no legal advancing move left
    - normal move input is locked
4. Restart after win, dock-full loss, and no-legal-move loss and verify:
     - the same fixed opening layout returns
     - the passenger queue resets
     - the dock is empty again
     - normal input becomes active again

## Phase 6 regression sign-off

- `pnpm build` passed on 2026-03-23 after the Phase 6 UI polish changes.
- `pnpm lint` still stopped at the existing interactive Next.js ESLint setup prompt because the repo does not yet include an ESLint config.
- Local browser validation passed for blocked parking taps, non-matching dock staging, invalid early dock taps, later dock resolution on explicit tap, the win overlay, the dock-full loss overlay, and restart after completed attempts.
- The documented no-legal-move loss route was not reproducible from the fixed level during this regression pass and should be re-checked if that outcome remains a required acceptance scenario for this layout.

## Expected implementation touchpoints

- `app\components\CarJam.tsx`
- `app\components\game\*`
- `app\lib\game\*`
- `app\page.tsx` for entry and exit wiring only

## Out of scope for this feature

- Multiple levels or generated variations
- Durable gameplay persistence
- New backend services
- Referral, payment, or bot-copy rewrites unless they are directly required by the playable level
