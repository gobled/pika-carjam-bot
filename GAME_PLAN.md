# Pika CarJam Game Plan

This project is already set up as a Telegram Mini App using `Next.js` with the App Router, `Tailwind CSS`, Telegram Web App SDKs, and in-app API routes. Because of that, the plan should focus on evolving the current codebase into a real Car Jam Color-style game rather than introducing a separate frontend or backend stack from scratch.

## Current Project Reality

The repository already includes these core pieces:

- **Mini App frontend:** `app/page.tsx`
- **Gameplay entry component:** `app/components/CarJam.tsx`
- **Telegram Web App helper:** `app/lib/telegram.ts`
- **Telegram bot webhook:** `app/api/webhook/route.ts`
- **Referral system:** `app/api/referrals/*` backed by `app/lib/referralStorage.ts`
- **UI stack:** `React`, `Next.js 15`, `Tailwind CSS`
- **Telegram libraries:** `@telegram-apps/sdk`, `@telegram-apps/sdk-react`, `telegraf`
- **Game-related libraries already installed:** `pixi.js`, `howler`

## What the App Already Does

The app already has a solid Telegram-friendly shell:

- Initializes Telegram Web App features such as `ready()`, `expand()`, fullscreen, haptics, and closing confirmation.
- Shows a home screen with:
  - play entry
  - high score storage in `localStorage`
  - mute toggle
  - daily play counter
  - referrals tab
- Supports referral sharing and referral reward claiming through local API routes.
- Handles Telegram bot `/start` and `/webapp` commands through the webhook route.

## Game Definition

Pika CarJam should follow the **parking jam + color match** formula:

- The player sees a crowded parking lot filled with colored cars and buses.
- A passenger queue shows which color needs to leave next.
- Tapping a vehicle should attempt to move it out of the lot.
- A vehicle only exits successfully when its color matches the next passenger in line.
- Vehicles remain subject to parking-jam rules, so blocked paths prevent movement.
- Non-matching vehicles can be temporarily stored in a limited holding area or dock.
- Filling the dock with the wrong colors loses the level.

This means the game is **not** a pure single-target escape puzzle. It is a queue-driven, color-matching parking puzzle with strategic unblocking.

## Current Gaps

The actual color-match parking puzzle gameplay is still mostly a placeholder.

- `app/components/CarJam.tsx` currently renders a temporary screen instead of the real game.
- The current bot copy still references older wording and should eventually be updated to match the Pika CarJam brand.
- Referral persistence is development-friendly but not production-grade yet because it uses in-memory storage plus a local JSON file.
- There is not yet a full game loop with a passenger queue, dock logic, match rules, level win conditions, loss conditions, or progression.

## Recommended Technical Direction

Given the current structure, the most practical path is:

- Keep **Next.js App Router** as the host app.
- Build the gameplay inside `app/components/CarJam.tsx` and related game modules.
- Use **PixiJS** for rendering the board, vehicles, passenger queue, and dock if the game needs a richer canvas experience.
- Use **Howler** for lightweight sound effects.
- Keep the current **Next.js API routes** for MVP features such as referrals, payments, and webhook handling.
- Delay introducing an external backend until the game needs stronger persistence, analytics, or multiplayer features.

## Target Gameplay Loop

| Phase | Planned behavior |
| --- | --- |
| Start | Player opens the Mini App from Telegram and lands on the current home screen. |
| Enter game | Tapping `Play` consumes one available play and opens the gameplay view. |
| Read queue | The player sees the next passenger color that must be matched. |
| Make move | The player taps a vehicle. If its path is clear, it tries to leave the lot. |
| Match or dock | Matching vehicles satisfy the next passenger. Non-matching vehicles go into the dock if space is available. |
| Unblock | The player strategically frees blocked vehicles to reach the colors needed later in the queue. |
| Win | The player clears the passenger queue or satisfies the level goal and moves to the next level or result screen. |
| Lose / exit | The player loses if the dock fills up with the wrong colors, then can retry, go back, or wait for more daily plays if limits are active. |
| Re-engage | Referral sharing and Telegram-native reopening keep the loop social and repeatable. |

## Implementation Roadmap

### Phase 1: Replace the Placeholder With a Real Core Game

Focus on turning `app/components/CarJam.tsx` into an actual playable color-match parking puzzle.

- Define the board model:
  - grid size
  - vehicle shapes and orientation
  - occupied cells
  - vehicle color
  - exit lanes
- Define the level state:
  - passenger queue
  - dock slot count
  - remaining dock capacity
  - level completion target
- Implement movement rules:
  - vehicles move only along their allowed axis
  - blocked paths prevent movement
  - valid move detection
  - vehicle exit detection
- Implement match resolution:
  - if vehicle color matches the next passenger, remove both from play
  - if it does not match, move the vehicle into the dock
  - if the dock is full, trigger level loss
- Add win condition logic for clearing the queue or otherwise completing the level goal.
- Add reset, retry, and back-to-menu flows.
- Persist high score or best completion data using the same local-first approach already used on the home screen.

### Phase 2: Add Game UX and Polish

Use the existing Telegram and frontend setup to improve feel and retention.

- Add touch-friendly drag or tap controls.
- Add sound effects with `howler`.
- Add haptic feedback for:
  - valid match
  - blocked move
  - docked wrong-color move
  - win
  - loss
- Add level start, win, and retry states.
- Improve the HUD with passenger queue, dock slots, moves, level number, or score.

### Phase 3: Connect Progression to the Existing App Shell

Make the game feel like one connected product instead of a tech demo.

- Show real post-game results from the gameplay screen.
- Tie progression into the existing play-limit system.
- Decide whether referral rewards grant:
  - more plays
  - cosmetics
  - boosters such as extra dock slots or undo
- Update the landing screen copy so it matches the real gameplay loop.

### Phase 4: Production-Ready Telegram Features

Build on the infrastructure that already exists.

- Update bot command text and Mini App launch messaging in `app/api/webhook/route.ts`.
- Add stronger persistence for referrals and player progress.
- Revisit payments once gameplay is stable.
- Consider Telegram Stars for optional extras such as:
  - extra plays
  - hints
  - extra dock slots
  - cosmetic themes

## File-by-File Impact Plan

### `app/page.tsx`

- Keep as the main Mini App shell.
- Continue managing:
  - Telegram initialization
  - local player state
  - tabs
  - play entry
  - referrals
- Wire it to the real gameplay component once the game exists.

### `app/components/CarJam.tsx`

- This should become the primary gameplay container.
- It should own the first playable version of:
  - parking lot board state
  - passenger queue
  - dock state
  - move and match resolution
- It will likely need to be split into smaller modules once real logic is added.

### `app/lib/telegram.ts`

- Keep this as the small access layer for Telegram Web App APIs.
- Expand only if game-specific helpers are needed.

### `app/lib/referralStorage.ts`

- Fine for local development and MVP testing.
- Replace with durable storage before production launch.

### `app/api/webhook/route.ts`

- Keep as the Telegram bot entry point.
- Update messaging and sharing behavior to match the final Pika CarJam product identity.

## MVP Recommendation

The best MVP for this repository is not a full marketplace-style TMA. It is:

- one polished single-player Car Jam Color-style puzzle mode
- one fixed level with colored vehicles
- one visible passenger queue
- one limited dock area
- working match, unblock, and lose-state logic
- Telegram-native launch and haptics
- local progression or score tracking
- working referrals
- simple replayable sessions

That matches the current codebase, keeps scope realistic, and lets the team ship a real playable Mini App faster.

## Notes

- Avoid introducing a separate backend until it is clearly needed.
- Reuse the existing Telegram integration and API route structure.
- Build the game around the current shell rather than replacing it.
- Treat referrals and monetization as secondary to making the core puzzle genuinely fun.
- Prioritize validating the queue-plus-dock puzzle loop before adding multiple levels or monetization.
