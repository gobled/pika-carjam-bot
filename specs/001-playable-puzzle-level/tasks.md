# Tasks: Playable Puzzle Level

**Input**: Design documents from `/specs/001-playable-puzzle-level/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/playable-level-ui-contract.md`, `quickstart.md`

**Verification**: User Scenarios & Testing are mandatory for this feature, so each user story includes explicit manual validation tasks in `specs/001-playable-puzzle-level/quickstart.md`. Repository-wide sign-off also includes `pnpm build` and `pnpm lint` from `package.json`.

**Organization**: Tasks are grouped by user story so each story can be implemented, validated, and demonstrated as an independent playable increment inside the existing Next.js Mini App.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after dependencies are complete
- **[Story]**: Maps the task to a specific user story (`[US1]`, `[US2]`, `[US3]`)
- Every task includes the exact file path that should be touched

## Path Conventions

- Gameplay shell: `app/components/CarJam.tsx`, `app/page.tsx`
- Gameplay UI: `app/components/game/*.tsx`
- Deterministic rules and state: `app/lib/game/*.ts`
- Feature docs and manual validation: `specs/001-playable-puzzle-level/*.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the gameplay module and replace the placeholder play surface with the feature entry points required by all stories.

- [X] T001 Create the gameplay module scaffolding in `app/lib/game/types.ts`, `app/lib/game/levelLayout.ts`, `app/lib/game/pathfinding.ts`, `app/lib/game/gameState.ts`, and `app/lib/game/validation.ts`
- [X] T002 [P] Create the gameplay UI scaffolding in `app/components/game/GameBoard.tsx`, `app/components/game/PassengerQueue.tsx`, `app/components/game/DockArea.tsx`, and `app/components/game/GameOverlay.tsx`
- [X] T003 Refactor the playable-level shell in `app/components/CarJam.tsx` and `app/page.tsx` so the existing Mini App launches the new level surface instead of the placeholder canvas

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared rules, layout, and state transitions that every user story relies on.

**⚠️ CRITICAL**: Complete this phase before starting user story implementation.

- [X] T004 Define shared gameplay entities, move feedback, attempt status, and loss-reason types from `specs/001-playable-puzzle-level/data-model.md` in `app/lib/game/types.ts`
- [X] T005 [P] Encode the fixed opening board layout, passenger order, and three-slot dock seed data in `app/lib/game/levelLayout.ts`
- [X] T006 [P] Implement the clear-path occupancy scan for parking-lot exits in `app/lib/game/pathfinding.ts`
- [X] T007 Implement move-legality and no-legal-move detection helpers from `specs/001-playable-puzzle-level/research.md` in `app/lib/game/validation.ts`
- [X] T008 Implement attempt initialization, parking-tap resolution, dock slot assignment, and restart helpers in `app/lib/game/gameState.ts`
- [X] T009 Wire shared attempt state, tap callbacks, and component props across `app/components/CarJam.tsx`, `app/components/game/GameBoard.tsx`, `app/components/game/PassengerQueue.tsx`, `app/components/game/DockArea.tsx`, and `app/components/game/GameOverlay.tsx`

**Checkpoint**: Foundational rules are ready, and user stories can now be implemented against a stable fixed level.

---

## Phase 3: User Story 1 - Clear matching vehicles (Priority: P1) 🎯 MVP

**Goal**: Let players tap a clear vehicle, reject blocked moves, and advance the passenger queue when the tapped vehicle matches the next passenger.

**Independent Test**: Load the level, tap a blocked vehicle, then tap an unblocked matching vehicle; only the legal matching tap should remove the vehicle, advance the queue, and update the next target passenger.

### Verification for User Story 1 (MANDATORY) ⚠️

- [X] T010 [US1] Record the blocked-tap and matching-exit manual validation steps in `specs/001-playable-puzzle-level/quickstart.md`

### Implementation for User Story 1

- [X] T011 [P] [US1] Implement fixed-layout parking-lot rendering and vehicle tap targets in `app/components/game/GameBoard.tsx`
- [X] T012 [P] [US1] Implement next-passenger-first queue rendering and active target styling in `app/components/game/PassengerQueue.tsx`
- [X] T013 [US1] Connect parking-lot tap handling, blocked-move state, and successful queue advancement in `app/components/CarJam.tsx`
- [X] T014 [US1] Show blocked-move and successful-exit feedback that matches `specs/001-playable-puzzle-level/contracts/playable-level-ui-contract.md` in `app/components/game/GameOverlay.tsx`

**Checkpoint**: User Story 1 is playable as the MVP loop for blocked checks and matching exits.

---

## Phase 4: User Story 2 - Use the dock strategically (Priority: P2)

**Goal**: Let players send non-matching clear vehicles into the dock and later resolve docked vehicles only through an explicit tap.

**Independent Test**: Tap an unblocked non-matching vehicle to move it into an open dock slot, then advance the queue until that docked vehicle becomes the next match and verify it resolves only when tapped.

### Verification for User Story 2 (MANDATORY) ⚠️

- [X] T015 [US2] Record the dock-storage and explicit dock-resolution manual validation steps in `specs/001-playable-puzzle-level/quickstart.md`

### Implementation for User Story 2

- [X] T016 [P] [US2] Implement dock slot rendering, occupancy display, and docked-vehicle tap targets in `app/components/game/DockArea.tsx`
- [X] T017 [P] [US2] Extend parking-to-dock and dock-to-resolved transitions for non-matching and later-matching vehicles in `app/lib/game/gameState.ts`
- [X] T018 [US2] Connect non-matching parking taps and docked-vehicle taps to dock interactions in `app/components/CarJam.tsx`
- [X] T019 [US2] Show dock-capacity and invalid-dock-tap feedback from the UI contract in `app/components/game/GameOverlay.tsx`

**Checkpoint**: User Stories 1 and 2 now support the full core puzzle loop of clearing and staging vehicles.

---

## Phase 5: User Story 3 - Reach a clear end state (Priority: P3)

**Goal**: Show distinct win and loss outcomes, lock gameplay after completion, and support fixed-layout restart and exit actions.

**Independent Test**: Complete one winning run and one losing run; both must display distinct overlays, prevent further gameplay input, and allow restart back to the same opening layout.

### Verification for User Story 3 (MANDATORY) ⚠️

- [X] T020 [US3] Record the win, dock-full loss, no-legal-move loss, and restart manual validation steps in `specs/001-playable-puzzle-level/quickstart.md`

### Implementation for User Story 3

- [X] T021 [P] [US3] Extend outcome detection, input locking, and fixed-layout restart logic in `app/lib/game/gameState.ts` and `app/lib/game/validation.ts`
- [X] T022 [P] [US3] Implement distinct win and loss overlays with restart and exit actions in `app/components/game/GameOverlay.tsx`
- [X] T023 [US3] Lock board and dock interactions after completion and wire restart or exit actions through `app/components/CarJam.tsx` and `app/page.tsx`
- [X] T024 [US3] Reflect completed-attempt state in the queue and dock surfaces in `app/components/game/PassengerQueue.tsx` and `app/components/game/DockArea.tsx`

**Checkpoint**: All user stories are independently functional, and the level has a complete playable lifecycle.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final alignment, responsive polish, and repository-level sign-off for the feature.

- [X] T025 [P] Refine touch-first portrait layout and spacing across `app/components/CarJam.tsx`, `app/components/game/GameBoard.tsx`, `app/components/game/PassengerQueue.tsx`, `app/components/game/DockArea.tsx`, and `app/components/game/GameOverlay.tsx`
- [X] T026 Reconcile gameplay behavior against `specs/001-playable-puzzle-level/contracts/playable-level-ui-contract.md` in `app/components/CarJam.tsx`, `app/components/game/GameBoard.tsx`, `app/components/game/DockArea.tsx`, and `app/components/game/GameOverlay.tsx`
- [X] T027 Run `pnpm build` and `pnpm lint` from `package.json` and capture any feature-relevant follow-up notes in `specs/001-playable-puzzle-level/tasks.md`
- [X] T028 Execute the full manual regression checklist and capture sign-off notes in `specs/001-playable-puzzle-level/quickstart.md` and `specs/001-playable-puzzle-level/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** → no dependencies
- **Phase 2: Foundational** → depends on Phase 1 and blocks all user story work
- **Phase 3: US1** → depends on Phase 2 and delivers the MVP matching loop
- **Phase 4: US2** → depends on Phase 2 and is best implemented after US1 stabilizes the parking-lot tap flow
- **Phase 5: US3** → depends on Phase 2 and is best implemented after US1 and US2 define all win/loss-producing transitions
- **Phase 6: Polish** → depends on the desired user stories being complete

### User Story Dependency Graph

`Setup → Foundational → US1 → US2 → US3 → Polish`

- **US1 (P1)**: First playable slice and recommended MVP release
- **US2 (P2)**: Extends the same tap-and-resolve loop with dock storage and explicit dock taps
- **US3 (P3)**: Completes the attempt lifecycle once matching and docking transitions already exist

### Within Each User Story

- Manual validation tasks are mandatory before story sign-off
- Shared deterministic helpers in `app/lib/game/*.ts` should be updated before wiring UI behavior in `app/components/*.tsx`
- Presentational components should be in place before final integration in `app/components/CarJam.tsx`
- Finish each story’s interaction loop before moving to the next priority

### Parallel Opportunities

- **Setup**: `T002` can run while `T003` is prepared after `T001` establishes the gameplay module paths
- **Foundational**: `T005` and `T006` can run in parallel once `T004` defines the shared types
- **US1**: `T011` and `T012` can run in parallel before `T013` integrates them in `CarJam`
- **US2**: `T016` and `T017` can run in parallel before `T018` connects dock UI and state
- **US3**: `T021` and `T022` can run in parallel before `T023` wires final restart and lock behavior

---

## Parallel Example: User Story 1

```bash
Task: "T011 [US1] Implement fixed-layout parking-lot rendering and vehicle tap targets in app/components/game/GameBoard.tsx"
Task: "T012 [US1] Implement next-passenger-first queue rendering and active target styling in app/components/game/PassengerQueue.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T016 [US2] Implement dock slot rendering, occupancy display, and docked-vehicle tap targets in app/components/game/DockArea.tsx"
Task: "T017 [US2] Extend parking-to-dock and dock-to-resolved transitions for non-matching and later-matching vehicles in app/lib/game/gameState.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T021 [US3] Extend outcome detection, input locking, and fixed-layout restart logic in app/lib/game/gameState.ts and app/lib/game/validation.ts"
Task: "T022 [US3] Implement distinct win and loss overlays with restart and exit actions in app/components/game/GameOverlay.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate blocked taps and matching exits with the manual quickstart flow
5. Demo the first playable matching loop before expanding to dock strategy

### Incremental Delivery

1. Finish Setup + Foundational to establish the fixed level, rules engine, and component wiring
2. Deliver **US1** as the MVP playable slice
3. Add **US2** to introduce dock strategy without changing the fixed layout contract
4. Add **US3** to finalize win/loss clarity, restart, and post-game input lock
5. Run build, lint, and manual regression sign-off in Phase 6

### Parallel Team Strategy

1. One developer finishes shared setup and deterministic rules in `app/lib/game`
2. A second developer prepares UI surfaces in `app/components/game`
3. After Foundational is complete:
   - Developer A: US1 board and queue integration
   - Developer B: US2 dock behavior
   - Developer C: US3 overlays and completion handling

---

## Notes

- No extension hooks were emitted because `.specify/extensions.yml` is not present for this project
- Manual validation is the required story-level verification because the current repo tooling exposes `pnpm build` and `pnpm lint`, but no dedicated gameplay test runner
- All tasks use the required checklist format with checkbox, task ID, optional `[P]`, required story label for story phases, and exact file paths
- Phase 6 sign-off on 2026-03-23: `pnpm build` passed after the portrait-layout and contract-copy updates.
- `pnpm lint` still stops at the existing interactive Next.js ESLint setup prompt because the repository does not yet include an ESLint configuration.
- Browser regression on the local dev server passed for blocked taps, dock staging, invalid dock taps, explicit dock resolution, win, dock-full loss, and restart after completed attempts.
- The quickstart's no-legal-move loss scenario could not be reproduced from the fixed layout during the Phase 6 regression pass, so that acceptance path remains a follow-up item to confirm or redesign.
