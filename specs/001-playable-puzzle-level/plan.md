# Implementation Plan: Playable Puzzle Level

**Branch**: `001-playable-puzzle-level` | **Date**: 2026-03-23 | **Spec**: `C:\Projects\Personal\pika-workspace\pika-carjam-bot\specs\001-playable-puzzle-level\spec.md`
**Input**: Feature specification from `C:\Projects\Personal\pika-workspace\pika-carjam-bot\specs\001-playable-puzzle-level\spec.md`

## Summary

Replace the placeholder `CarJam` screen with one fixed, replayable parking-puzzle level inside the existing Telegram Mini App shell. The implementation should keep gameplay state client-side, split deterministic game rules into small `app\lib\game` modules, and render a touch-friendly board, passenger queue, dock, and end-state overlay through React components that fit the current Next.js app structure.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.2, Next.js 15.0.7  
**Primary Dependencies**: Next.js App Router, React, Tailwind CSS, `@telegram-apps/sdk`, `@telegram-apps/sdk-react`, `telegraf`  
**Storage**: Session-local React state for level play; existing `localStorage` remains limited to shell concerns such as plays, mute, and high score  
**Testing**: `pnpm build`, `pnpm lint`, and manual Mini App validation against spec scenarios  
**Target Platform**: Telegram Mini App in portrait mobile browsers, with safe fallback behavior during local browser development  
**Project Type**: Web application (Next.js Mini App with in-app API routes)  
**Performance Goals**: Maintain responsive tap feedback and smooth board updates on mobile-sized devices for a short-session puzzle loop  
**Constraints**: Touch-first portrait layout, fixed level layout, 3 dock slots, explicit tap-to-resolve behavior for docked vehicles, no new backend or durable gameplay storage, post-win/loss input lock  
**Scale/Scope**: One fixed playable level, one active attempt at a time, no multiplayer, no progression backend, no level generation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Telegram-native experience preserved**: Pass. The feature lives entirely in the existing Mini App play surface and keeps the current shell, Telegram initialization, and out-of-Telegram local dev fallback. Design work must keep the board readable in portrait and make taps, feedback, and replay clear on mobile.
- **Playable-core priority preserved**: Pass. This work is the first real implementation of the queue-driven parking puzzle loop and directly advances the stated MVP.
- **Local-first architecture preserved**: Pass. Gameplay remains client-side in the Next.js app with no new backend, queue, or hosted dependency. Durability is intentionally session-local for level state.
- **Verification defined**: Pass. Validate with `pnpm build`, attempt `pnpm lint`, and manual checks for blocked moves, dock storage, win, full-dock loss, no-legal-move loss, and fixed-layout restart behavior.
- **Lean architecture preserved**: Pass. The plan uses small game-rule modules and UI subcomponents within the existing app boundaries. No new dependencies or cross-cutting frameworks are required.

### Post-Design Constitution Check

- **Telegram-native experience preserved**: Pass. Phase 1 artifacts keep the game inside the current play surface and define a UI contract centered on touch targets, portrait readability, and explicit post-game replay.
- **Playable-core priority preserved**: Pass. Data model, research, quickstart, and contract outputs all stay focused on the first playable level rather than referral, bot, or monetization expansion.
- **Local-first architecture preserved**: Pass. Design artifacts keep all puzzle rules and level layout in local modules with no new persistence boundary.
- **Verification defined**: Pass. Quickstart includes the concrete manual validation flow alongside `pnpm build` and `pnpm lint`.
- **Lean architecture preserved**: Pass. Design stays within `app\components` and `app\lib` with explicit state and interaction contracts.

## Project Structure

### Documentation (this feature)

```text
specs/001-playable-puzzle-level/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── playable-level-ui-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── referrals/
│   └── webhook/
├── components/
│   ├── CarJam.tsx
│   └── game/
│       ├── GameBoard.tsx
│       ├── PassengerQueue.tsx
│       ├── DockArea.tsx
│       └── GameOverlay.tsx
├── lib/
│   ├── referralStorage.ts
│   ├── telegram.ts
│   └── game/
│       ├── types.ts
│       ├── levelLayout.ts
│       ├── gameState.ts
│       ├── pathfinding.ts
│       └── validation.ts
├── globals.css
├── layout.tsx
└── page.tsx

public/
specs/
```

**Structure Decision**: Use the existing single Next.js Mini App structure and add focused game modules under `app\lib\game` plus presentational gameplay components under `app\components\game`. Keep `app\page.tsx` as the shell that enters and exits gameplay, and keep Telegram-specific access in `app\lib\telegram.ts` rather than mixing it into core puzzle rules.

## Phase 0: Research Plan

1. Confirm the most maintainable representation for a fixed parking-lot level and deterministic move resolution.
2. Confirm how to detect a clear exit path without introducing unnecessary rendering or pathfinding complexity.
3. Confirm whether React DOM is sufficient for the first playable board before adopting PixiJS.
4. Confirm that local-only state and manual validation are the right MVP trade-offs for the current repo.

## Phase 1: Design Plan

1. Define entities and state transitions for vehicles, passengers, dock slots, attempts, and level layout.
2. Define the user-facing interaction contract for taps, blocked moves, successful exits, docking, win, loss, and restart.
3. Document a quickstart that covers local launch, Telegram validation, and manual acceptance scenarios.
4. Update the Copilot agent context after design artifacts are in place.

## Complexity Tracking

No constitution violations or justified complexity additions are required for this feature.
