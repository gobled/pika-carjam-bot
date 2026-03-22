Build a Telegram Web Game Similar to Car Jam: Escape Puzzle

Goal

Build a Telegram Web App game for casual players age 6 to 12.

The game should feel similar to Car Jam / escape puzzle games:

- simple to understand
- satisfying to interact with
- short levels
- fast retry loop
- colorful and friendly
- touch-first UX

Current Repository Reality

This project should follow the product vision above, but implementation must match the current repository structure.

This repository is currently:

- a Next.js App Router application
- written in TypeScript
- using React for UI
- using Telegram Web App integration in the frontend
- using local Next.js route handlers under `app/api`
- using Telegraf for the Telegram bot webhook
- using simple local persistence for MVP-style server state where needed
- deployed as a single Vercel app

For the MVP:

- do not introduce a separate FastAPI service
- do not restructure into a monorepo yet
- keep the implementation inside the existing Next.js codebase
- use `pnpm` as the package manager

Tech Stack

- Frontend language: TypeScript
- Frontend framework: Next.js App Router + React
- Styling: Tailwind CSS
- Telegram bot/webhook: Telegraf inside Next.js route handlers
- MVP server layer: Next.js route handlers in `app/api`
- MVP persistence: simple local JSON/file-backed or in-memory helpers as needed
- Deployment: Vercel

Current Project Structure

The plan should align with the current folder layout:

```text
/app
  /api
    /referrals
      /claim/route.ts
      /[userId]/route.ts
    /webhook/route.ts
  /components
    CarJam.tsx
  /lib
    referralStorage.ts
    telegram.ts
  layout.tsx
  page.tsx
/public
/README.md
/package.json
```

Intended responsibilities:

- `app/page.tsx` -> app shell, home screen, tabs, session bootstrap
- `app/components/` -> gameplay and UI components
- `app/lib/` -> reusable logic, schemas, storage helpers, Telegram helpers, puzzle engine
- `app/api/` -> route handlers for webhook, progress, rewards, referrals, leaderboard, and other MVP server actions
- `public/` -> static assets, sounds, lightweight images
- `data/` -> optional local JSON persistence for MVP server data where appropriate

Main Product Requirements

Create a puzzle game where:

- the player sees a blocked parking/grid puzzle
- vehicles can only move in allowed directions
- the player must clear a path and solve the level
- levels are short, easy to restart, and progressively harder
- user progress is saved
- the game runs inside Telegram Web Apps
- the UI is suitable for children age 6-12

High-Level Implementation Instructions

1. Keep and extend the current project structure

Do not convert the project into separate frontend and backend apps for MVP.

Instead:

- keep the single Next.js application
- add new UI components in `app/components`
- add game logic, level schemas, and helpers in `app/lib`
- add route handlers in `app/api`
- add local data files only where they support MVP persistence cleanly

Add and maintain:

- TypeScript-safe code
- linting via the existing Next.js setup
- environment variable support
- documentation that matches the real structure

2. Build the frontend shell in Next.js

Implement the app with:

- Next.js App Router
- React + TypeScript
- mobile-first layout
- Telegram Web App bootstrap
- simple local/client state for player session and game state

Create these main screens and states:

- loading state
- home screen
- level select screen
- gameplay screen
- win popup / victory screen
- daily reward popup
- settings screen
- leaderboard screen

Requirements:

- large touch targets
- minimal text
- colorful kid-friendly visuals
- responsive layout for Telegram mobile webview

3. Integrate Telegram Web App SDK

Implement Telegram Web App support inside the existing Next.js app.

Tasks:

- detect if app is running inside Telegram
- initialize Telegram Web App SDK on startup
- expand web app on launch
- read Telegram launch/init data
- support fallback local development mode outside Telegram
- use Telegram user context in the UI and route handlers where needed

Expected behavior:

- when opened inside Telegram, the player sees their Telegram identity in the app
- when opened outside Telegram, development mode still allows local testing

4. Implement MVP server logic with Next.js route handlers

For this repository, the MVP server logic should live in `app/api`.

Do not build a separate backend service yet.

Tasks:

- keep `app/api/webhook/route.ts` as the Telegram bot webhook entry point
- keep referral routes under `app/api/referrals`
- add future MVP routes under `app/api` for progress, rewards, levels, and leaderboard
- use simple helpers in `app/lib` for validation, persistence, and game-related data access

Suggested MVP route areas:

- `app/api/webhook/route.ts`
- `app/api/referrals/claim/route.ts`
- `app/api/referrals/[userId]/route.ts`
- future: `app/api/progress/...`
- future: `app/api/rewards/...`
- future: `app/api/levels/...`
- future: `app/api/leaderboard/...`

Server-side data rules:

- keep logic simple and abuse-resistant
- prefer explicit request validation
- avoid overengineering
- for MVP, simple JSON/file-backed persistence is acceptable
- if persistence grows, move behind helpers in `app/lib` first

5. Implement the puzzle engine

Build the core gameplay system as reusable logic under `app/lib`.

Recommended placement:

- `app/lib/game/` for board state, movement rules, win detection, helpers

Rules:

- board is a grid
- each vehicle has:
  - id
  - position
  - length
  - orientation (horizontal or vertical)
  - type
- vehicles move only along their orientation
- vehicles cannot overlap
- invalid moves are rejected
- level is solved when target vehicle reaches exit

Implement:

- board state model
- move validation
- collision detection
- win detection
- level reset
- undo last move
- move counter
- optional hint hooks for future use

The engine should be deterministic and testable.

6. Define level schema

Create a typed level schema and store level definitions in a location that fits this repository.

Recommended options:

- `app/lib/levels/`
- `data/levels/`

Each level should include:

- level_id
- board_width
- board_height
- exit position
- target vehicle id
- vehicle list
- star thresholds
- theme id
- hint metadata placeholder

Vehicle schema:

- id
- x
- y
- length
- orientation
- role/type
- color or skin key

Add validation for level data.

7. Add the first playable level pack

Create at least:

- 10 tutorial/easy levels first
- structure to support 30 launch levels

Difficulty goals:

- first levels must be solvable in seconds
- no frustration spike in first 10 levels
- gradually introduce blockers and tighter layouts

Also implement:

- restart level
- next level
- back to map
- star score based on move count
- save completion state

8. Build gameplay UI

Implement the gameplay screen using components in `app/components`.

Include:

- puzzle board
- move counter
- restart button
- undo button
- home/back button
- level indicator
- optional hint button placeholder
- sound toggle

UX rules:

- interactions must feel immediate
- animations should be short and satisfying
- invalid move feedback should be clear
- victory feedback should be celebratory but not overwhelming

Prioritize touch usability over fancy visuals.

9. Add player progression

Implement progression support using the frontend plus local route handlers.

Required features:

- fetch player progress
- mark level completed
- unlock next level
- save best move count / best star rating
- resume progress on next session

Suggested MVP route handlers:

- `GET /api/me` or equivalent user session endpoint if needed
- `GET /api/progress`
- `POST /api/progress/complete`
- `GET /api/levels`
- `GET /api/levels/[id]`

Frontend should:

- load progress after startup
- show locked/unlocked levels
- persist current session state cleanly

10. Implement daily reward

Add a simple retention feature.

Requirements:

- player can claim one reward per day
- track streak count
- reward can be coins, stars, or gameplay currency placeholder
- frontend shows claim popup on eligible login

Suggested route handlers:

- `GET /api/rewards/daily`
- `POST /api/rewards/daily/claim`

Keep logic simple and abuse-resistant.

11. Implement leaderboard

Create a basic leaderboard.

Scope for MVP:

- global leaderboard
- metric can be total stars or levels completed

Suggested route handlers:

- `GET /api/leaderboard/global`
- optional: `GET /api/leaderboard/friends`

Frontend should show:

- player rank if available
- top entries
- simple child-friendly presentation

Do not build a complicated social system for MVP.

12. Add sound and feedback

Implement basic feedback systems.

Audio:

- move sound
- blocked move sound
- victory sound
- mute toggle

Visual feedback:

- smooth vehicle motion
- button tap response
- success animation on level clear
- reward claim animation
- subtle invalid move feedback

Keep assets lightweight and web-friendly.

13. Add analytics event hooks

Implement simple analytics hooks in the frontend and, if useful, mirrored route logging in `app/api`.

Track:

- app_open
- login_success
- level_start
- move_made
- level_restart
- level_complete
- hint_used if button exists later
- daily_reward_claimed
- session_end if feasible

Purpose:

- identify tutorial drop-off
- measure level difficulty
- see where children stop playing

For MVP, lightweight event logging is enough.

14. Make UI safe and appropriate for kids

Apply these product rules throughout implementation:

- use minimal reading
- prefer icons + short labels
- avoid dark patterns
- avoid pressure tactics
- avoid complicated menus
- avoid chat features
- avoid unsafe outbound links
- avoid ads in MVP
- use friendly colors and large buttons
- make retrying easy and non-punishing

Design for children who may have limited patience and reading ability.

15. Prepare Vercel deployment

Deploy the single Next.js application to Vercel.

Deployment scope:

- frontend UI deployed from the Next.js app
- route handlers under `app/api` deployed with the same app
- Telegram webhook endpoint exposed through the deployed app
- environment variables configured for bot/web app behavior

Add:

- production env config
- preview env config
- Telegram app URL configuration support
- any file-based persistence assumptions clearly documented as MVP-only

Document deployment steps clearly in README.

Required Deliverables

Frontend deliverables

Implement:

- Next.js app shell
- Telegram integration
- home screen
- level select screen
- gameplay screen
- victory popup
- daily reward popup
- settings screen
- sound toggle
- progress sync
- leaderboard screen

Server deliverables

Implement:

- Telegram webhook route handler
- progress route handlers
- level content route handlers
- daily reward route handlers
- leaderboard route handlers
- simple persistence helpers
- request validation and safe update logic

Shared deliverables

Implement:

- level schema
- level data files
- constants
- validation helpers
- reusable gameplay logic in `app/lib`

MVP Acceptance Criteria

The MVP is complete when:

- a user can open the game inside Telegram
- the app reads Telegram launch data correctly
- the player can play at least 10 working levels
- vehicles move correctly and collisions are prevented
- win condition works
- progress is saved
- completed levels unlock the next level
- daily reward can be claimed once per day
- leaderboard data is viewable
- the game is usable on mobile and feels suitable for ages 6-12
- the single Next.js app is deployable on Vercel

Implementation Priorities

Implement in this order:

Priority 1

- stabilize the current Next.js + Telegram foundation
- fix Telegram SDK usage and current app-shell issues
- implement puzzle engine
- replace placeholder gameplay with a playable vertical slice

Priority 2

- levels
- progress save/load
- level select
- win flow
- restart/undo

Priority 3

- daily reward
- leaderboard
- sounds
- analytics hooks
- UI polish

Non-Goals for MVP

Do not spend time yet on:

- migrating to a separate backend
- monorepo restructuring
- multiplayer
- chat
- monetization
- advanced cosmetics
- seasonal events
- complex backend admin panels
- complex friend systems
- procedural generation

Coding Style Instructions

- keep code modular and readable
- keep gameplay logic separate from UI
- keep route handler contracts explicit
- use typed schemas everywhere possible
- write tests for puzzle engine and route-critical logic
- avoid overengineering
- prefer simple, production-usable implementations

Final Instruction

Implement the MVP end-to-end with clean structure and clear separation between:

- Next.js UI shell
- gameplay engine
- route handlers in `app/api`
- persistence helpers
- Telegram integration

Start with a playable vertical slice first, then expand to progression and retention features.
