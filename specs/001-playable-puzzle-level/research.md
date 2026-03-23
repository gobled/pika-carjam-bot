# Research: Playable Puzzle Level

## Decision 1: Keep gameplay rules in deterministic TypeScript modules

- **Decision**: Place the core puzzle rules in `app\lib\game` as pure or near-pure TypeScript helpers, with `CarJam` acting as the stateful UI container.
- **Rationale**: The repo already uses a React Mini App shell and does not yet have gameplay modules. Isolating move validation, win/loss detection, and level initialization from Telegram and rendering concerns keeps the first level easier to reason about and easier to validate manually.
- **Alternatives considered**:
  - Put all game logic directly inside `app\components\CarJam.tsx`: rejected because the component is expected to grow quickly and would become hard to test or extend.
  - Move gameplay to API routes: rejected because the spec explicitly keeps level state session-local and the constitution favors local-first MVP architecture.

## Decision 2: Use a fixed grid occupancy scan for clear-path checks

- **Decision**: Model the level as occupied parking cells and determine whether a vehicle can exit by scanning the cells between the vehicle and its exit lane.
- **Rationale**: The first level is fixed, small, and deterministic. A direct occupancy scan is easy to implement, explain, and debug, and it satisfies the requirement that a vehicle moves out only when its path is fully clear.
- **Alternatives considered**:
  - General-purpose pathfinding such as A*: rejected because vehicles do not navigate arbitrary paths; they only need a direct clear-path check.
  - Pixel-based collision checks in the renderer: rejected because game rules should stay independent from presentation.

## Decision 3: Start with React + Tailwind rendering rather than PixiJS

- **Decision**: Render the first playable board with React components and Tailwind styling, and defer PixiJS unless real performance or visual needs justify it later.
- **Rationale**: The repo already renders the shell with React, the first level is modest in scope, and the current task is to establish playable rules rather than a high-effects rendering pipeline. React DOM keeps debugging simple inside local browsers and Telegram.
- **Alternatives considered**:
  - Adopt PixiJS immediately: rejected because it adds implementation overhead before the basic loop is proven fun.
  - Use plain HTML tables or unstructured divs without component boundaries: rejected because it would make the board harder to evolve.

## Decision 4: Keep attempt state local and replay the same fixed layout

- **Decision**: Store the active level attempt only in client-side state and reset it to the same predefined layout, passenger queue, and empty dock on replay.
- **Rationale**: The feature spec explicitly says restart should replay the same layout and that no durable gameplay storage is required. This aligns with the constitution's local-first MVP guidance and avoids introducing unnecessary persistence for one playable level.
- **Alternatives considered**:
  - Persist active attempts in localStorage: rejected because it is not required for the first playable level and complicates state restoration.
  - Introduce a backend or database for gameplay state: rejected because it violates the current MVP direction without solving a current problem.

## Decision 5: Require explicit taps for dock resolution and end-state recovery

- **Decision**: Docked vehicles that become the correct color must still be tapped to resolve, and win/loss should transition the UI into a locked outcome state with an explicit restart path.
- **Rationale**: The spec clarifies that docked vehicles do not auto-resolve. Keeping all move resolution behind explicit taps creates a consistent interaction model and makes wins, losses, and retries easier for players to understand.
- **Alternatives considered**:
  - Auto-resolve docked vehicles when they match: rejected because it conflicts with the clarification and hides a meaningful player decision.
  - Allow continued tapping after win/loss: rejected because the requirements explicitly lock normal gameplay until restart or exit.
