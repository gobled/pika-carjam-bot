# Pika CarJam MVP Build Tasks

This document converts `GAME_PLAN.md` into an execution-ready checklist for the current repository.

## Objective

Build a Telegram Web App parking puzzle MVP inside the existing Next.js codebase, starting with a playable vertical slice and then layering progression, retention, and deployment readiness.

## Working Rules

- Keep everything inside the current Next.js App Router project.
- Use `pnpm` for package management and scripts.
- Keep gameplay logic separate from UI.
- Put reusable game/domain logic in `app/lib`.
- Put server actions in `app/api` route handlers.
- Favor typed schemas, explicit request validation, and simple MVP persistence.
- Optimize for mobile Telegram Web App usage and children ages 6-12.

## Suggested Output Files and Folders

Create or expand these areas as implementation proceeds:

```text
app/
  api/
    webhook/
    referrals/
    progress/
    rewards/
    levels/
    leaderboard/
    me/
  components/
    game/
    ui/
  lib/
    game/
    levels/
    storage/
    validation/
    analytics/
    telegram/
data/
  levels/
  players/
  rewards/
public/
  audio/
  images/
```

## Execution Plan

### Phase 1 - Stabilize the app shell and Telegram bootstrap

#### Goal
Make the current app reliable inside Telegram and usable outside Telegram during local development.

#### Tasks
1. Audit `app/page.tsx`, `app/components/CarJam.tsx`, and `app/lib/telegram.ts` to identify placeholder logic, Telegram SDK issues, and app-shell coupling.
2. Refactor Telegram bootstrap into reusable helpers/hooks so startup behavior is not mixed deeply with page UI.
3. Implement runtime detection for:
   - inside Telegram Web App
   - browser/local development fallback
4. Normalize launch/init data parsing into a typed session shape.
5. Expand the Web App on launch and keep safe progressive enhancement for optional Telegram APIs.
6. Add a lightweight loading state while Telegram and session data initialize.
7. Define top-level app states for:
   - loading
   - home
   - level select
   - gameplay
   - victory modal
   - daily reward modal
   - settings
   - leaderboard
8. Remove or isolate current non-MVP placeholder logic that does not map to the puzzle game experience.
9. Add basic error/fallback UI for missing Telegram data.
10. Document required environment variables and local-development behavior.

#### Definition of done
- App boots cleanly inside Telegram.
- App still works in a browser without Telegram.
- Home screen can render from a stable session model.

---

### Phase 2 - Build the deterministic puzzle engine

#### Goal
Create the reusable Rush Hour / Car Jam style gameplay engine under `app/lib`.

#### Tasks
1. Create `app/lib/game/` for engine code.
2. Define TypeScript types for:
   - board size
   - vehicle orientation
   - vehicle role/type
   - vehicle state
   - exit position
   - move result
   - game state
3. Implement board construction utilities.
4. Implement move validation so vehicles move only along their orientation.
5. Implement collision detection and bounds checking.
6. Reject invalid moves with structured reasons for UI feedback.
7. Implement target-car exit win detection.
8. Add level reset behavior.
9. Add undo support with move history.
10. Add move counting.
11. Add optional hint placeholders/interfaces without implementing full hint logic.
12. Keep engine functions pure and deterministic.
13. Add tests for:
   - valid moves
   - blocked moves
   - out-of-bounds moves
   - overlap prevention
   - win condition
   - undo/reset behavior

#### Definition of done
- Engine is testable without React.
- A board can be solved, reset, and undone deterministically.

---

### Phase 3 - Define level schema and author launch content

#### Goal
Create typed level data and the first playable level pack.

#### Tasks
1. Create `app/lib/levels/` or `data/levels/` for level definitions.
2. Define the level schema with:
   - `levelId`
   - `boardWidth`
   - `boardHeight`
   - `exit`
   - `targetVehicleId`
   - `vehicles`
   - `starThresholds`
   - `themeId`
   - `hintMetadata`
3. Define vehicle schema with:
   - `id`
   - `x`
   - `y`
   - `length`
   - `orientation`
   - `role`
   - `colorKey` or `skinKey`
4. Add runtime validation for level data.
5. Author the first 10 tutorial/easy levels.
6. Add structure for scaling to 30 launch levels.
7. Verify all first 10 levels are solvable and ramp difficulty gently.
8. Define star score logic from move counts.
9. Add utilities to fetch a level list, a single level, and next-level metadata.
10. Add tests or validation scripts to catch malformed level content.

#### Definition of done
- At least 10 valid levels exist.
- Levels can be loaded by ID and used directly by the engine.

---

### Phase 4 - Replace placeholder gameplay with a playable vertical slice

#### Goal
Ship a complete single-user gameplay loop for one session.

#### Tasks
1. Replace the placeholder `CarJam` component with real gameplay UI.
2. Build a board component with touch-first interactions.
3. Add draggable or tap-to-move controls that feel immediate on mobile.
4. Render vehicles from typed level data.
5. Connect UI actions to the engine.
6. Add visible move counter.
7. Add restart button.
8. Add undo button.
9. Add back/home button.
10. Add level indicator.
11. Add hint button placeholder.
12. Add victory modal/popup with:
   - success feedback
   - stars earned
   - next level action
   - return to level map action
13. Add clear invalid-move feedback.
14. Keep animations short and satisfying.
15. Ensure large touch targets and minimal reading.

#### Definition of done
- A player can start a level, move vehicles, win, restart, and undo.
- The game feels like a real vertical slice rather than a placeholder.

---

### Phase 5 - Build app navigation and player-facing screens

#### Goal
Wrap the vertical slice in the minimum set of screens required for MVP.

#### Tasks
1. Build the home screen.
2. Build level select/map screen with locked and unlocked states.
3. Build settings screen with sound toggle and simple app options.
4. Build leaderboard screen shell.
5. Add reusable modal/dialog components for victory and daily reward flows.
6. Add a simple state machine or reducer for top-level navigation.
7. Ensure all screens work in narrow Telegram mobile webviews.
8. Reduce text and favor icons + short labels where possible.
9. Keep visual design bright, friendly, and age-appropriate.

#### Definition of done
- The app has a coherent flow: home -> level select -> gameplay -> victory -> next action.

---

### Phase 6 - Add MVP persistence and player progress APIs

#### Goal
Persist progress cleanly using local route handlers and simple storage helpers.

#### Tasks
1. Create storage helpers under `app/lib/storage/` or similar.
2. Decide on MVP persistence approach:
   - local JSON files under `data/`
   - or in-memory with clear documentation if file writes are unsuitable
3. Define a player progress schema.
4. Implement route handlers for:
   - `GET /api/me` if a session/profile endpoint is useful
   - `GET /api/progress`
   - `POST /api/progress/complete`
   - `GET /api/levels`
   - `GET /api/levels/[id]`
5. Add explicit request validation for all new endpoints.
6. Save level completion, best move count, and best star rating.
7. Unlock the next level on completion.
8. Restore progress when the player returns.
9. Load progress on app startup.
10. Show locked/unlocked levels in the UI.
11. Add tests for route-critical logic and persistence helpers.

#### Definition of done
- Progress survives between sessions in the MVP persistence layer.
- Completing a level unlocks the next one.

---

### Phase 7 - Implement daily reward and streak logic

#### Goal
Add a lightweight retention feature without overengineering.

#### Tasks
1. Define reward and streak storage schema.
2. Implement:
   - `GET /api/rewards/daily`
   - `POST /api/rewards/daily/claim`
3. Enforce one claim per day.
4. Track streak count.
5. Return a simple currency placeholder such as coins or stars.
6. Show reward eligibility on login/startup.
7. Build the daily reward popup.
8. Add a simple claim animation and success feedback.
9. Protect the route logic against duplicate same-day claims.
10. Add tests for reward eligibility and streak updates.

#### Definition of done
- Eligible users can claim once per day and see streak progress.

---

### Phase 8 - Implement the leaderboard

#### Goal
Expose a simple, child-friendly leaderboard for the MVP.

#### Tasks
1. Define leaderboard aggregation rules.
2. Decide on ranking metric:
   - total stars
   - or levels completed
3. Implement `GET /api/leaderboard/global`.
4. Optionally scaffold a friends leaderboard endpoint without fully building social features.
5. Add storage/query helpers for leaderboard data.
6. Show top players and current player rank when available.
7. Keep the leaderboard UI easy to read and not overly competitive in tone.

#### Definition of done
- Leaderboard data is viewable in-app from the MVP backend layer.

---

### Phase 9 - Add sound, feedback, and polish

#### Goal
Improve feel without making the project asset-heavy or hard to maintain.

#### Tasks
1. Add lightweight audio assets under `public/audio/`.
2. Implement:
   - move sound
   - blocked move sound
   - victory sound
3. Add mute toggle persistence.
4. Add smooth vehicle motion.
5. Add tap/press response on buttons.
6. Add success animation on level clear.
7. Add subtle invalid-move shake or highlight.
8. Add reward claim animation.
9. Ensure feedback remains quick, readable, and not overwhelming for children.

#### Definition of done
- Core interactions feel responsive and satisfying with sound on or off.

---

### Phase 10 - Add analytics hooks

#### Goal
Capture enough product signals to evaluate onboarding and level friction.

#### Tasks
1. Create a small analytics helper under `app/lib/analytics/`.
2. Track these events:
   - `app_open`
   - `login_success`
   - `level_start`
   - `move_made`
   - `level_restart`
   - `level_complete`
   - `hint_used` placeholder
   - `daily_reward_claimed`
   - `session_end` if feasible
3. Keep implementation lightweight.
4. If useful, mirror event logging server-side through a simple route handler or server logger.
5. Ensure event hooks do not block gameplay.

#### Definition of done
- Key funnel events are available for MVP analysis.

---

### Phase 11 - Child-safety and UX review pass

#### Goal
Ensure the product experience is appropriate for ages 6-12.

#### Tasks
1. Review every screen for minimal reading load.
2. Replace verbose labels with icons + short labels where it improves clarity.
3. Remove pressure tactics or manipulative reward framing.
4. Avoid unsafe links and off-platform flows.
5. Avoid chat and other non-MVP social features.
6. Make retries fast and non-punishing.
7. Confirm buttons are large and spaced for touch.
8. Check color contrast and visual hierarchy.
9. Keep menus shallow and understandable.

#### Definition of done
- The MVP feels friendly, understandable, and safe for children.

---

### Phase 12 - Deployment readiness and documentation

#### Goal
Make the single-app MVP deployable on Vercel with clear setup instructions.

#### Tasks
1. Review `app/api/webhook/route.ts` and confirm production webhook expectations.
2. Document production and preview environment variables.
3. Document Telegram Web App URL setup.
4. Document webhook configuration steps.
5. Document persistence limitations of local/file-backed MVP storage on Vercel.
6. Update `README.md` to match the real architecture and gameplay implementation.
7. Add deployment checklist for Vercel.
8. Confirm build/lint/test commands are documented.

#### Definition of done
- Another developer can deploy the project to Vercel and understand MVP persistence tradeoffs.

## Recommended Milestones

### Milestone A - Vertical Slice
Complete Phases 1 through 4.

**Outcome:** Telegram-compatible app shell plus at least 10 playable levels and a real gameplay loop.

### Milestone B - Core MVP
Complete Phases 5 and 6.

**Outcome:** Players can navigate the app, save progress, unlock levels, and resume later.

### Milestone C - Retention and Social-lite
Complete Phases 7 and 8.

**Outcome:** Daily rewards and leaderboard are working.

### Milestone D - Polish and Launch Readiness
Complete Phases 9 through 12.

**Outcome:** Sound, analytics, child-safety review, and deployment docs are in place.

## Priority Order

Implement work in this order:

1. Telegram/app-shell stabilization
2. Puzzle engine
3. Level schema + first 10 levels
4. Playable gameplay UI
5. Navigation/screens
6. Progress save/load APIs
7. Daily reward
8. Leaderboard
9. Sound and feedback
10. Analytics hooks
11. Child-safety review
12. Deployment/docs

## Acceptance Checklist

Use this checklist to verify the MVP is complete:

- [ ] App opens inside Telegram Web Apps correctly.
- [ ] Telegram launch data is read correctly.
- [ ] App works outside Telegram for local development.
- [ ] At least 10 working levels are playable.
- [ ] Vehicles move according to orientation rules.
- [ ] Collisions and invalid moves are prevented.
- [ ] Win condition works.
- [ ] Restart and undo work.
- [ ] Progress is saved.
- [ ] Completing a level unlocks the next level.
- [ ] Daily reward can be claimed once per day.
- [ ] Leaderboard data is viewable.
- [ ] Sound can be toggled.
- [ ] UI feels mobile-friendly and child-appropriate.
- [ ] The single Next.js app can be deployed to Vercel.

## Immediate Next Actions

If starting implementation now, execute these first:

1. Refactor Telegram/session bootstrap out of `app/page.tsx`.
2. Create `app/lib/game/` with core engine types and move rules.
3. Define the level schema and author 10 tutorial levels.
4. Replace the placeholder `CarJam` component with a real board UI.
5. Add progress persistence helpers plus `GET /api/progress` and `POST /api/progress/complete`.

