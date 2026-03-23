# Feature Specification: Playable Puzzle Level

**Feature Branch**: `001-playable-puzzle-level`  
**Created**: 2026-03-23  
**Status**: Ready for Planning  
**Input**: User description: "Build one playable puzzle level where players see a parking lot of colored vehicles, a passenger color queue, and a limited dock. Tapping a vehicle should move it out only if its path is clear. If its color matches the next passenger, it exits successfully. Otherwise it goes to the dock. If the dock fills up, the player loses. If the queue is cleared, the player wins."

## Clarifications

### Session 2026-03-23

- Q: How many dock slots should the first playable level provide? → A: 3 dock slots.
- Q: What should happen if no legal move remains before the dock is full? → A: The player loses immediately.
- Q: Once a docked vehicle becomes the correct match, should it auto-resolve or require player input? → A: The player must tap it.
- Q: Should restarting the level replay the same layout or create a variation? → A: Replay the same fixed layout.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clear matching vehicles (Priority: P1)

As a player, I want to inspect a parking lot and tap a vehicle that has an open path so I can send the correct color to the next waiting passenger and make progress toward clearing the level.

**Why this priority**: This is the core puzzle loop. Without legal vehicle movement and color-matching exits, the level is not meaningfully playable.

**Independent Test**: Can be fully tested by loading the level, tapping a blocked vehicle and an unblocked matching vehicle, and confirming that only the legal move advances the passenger queue and removes the vehicle from play.

**Acceptance Scenarios**:

1. **Given** the next passenger in line is waiting for a blue vehicle and a blue vehicle has a clear path, **When** the player taps that vehicle, **Then** the vehicle exits the lot, the first passenger leaves the queue, and the level updates to show the next target passenger.
2. **Given** a vehicle is blocked by another vehicle in its lane, **When** the player taps the blocked vehicle, **Then** the vehicle remains in place and the level state does not advance.

---

### User Story 2 - Use the dock strategically (Priority: P2)

As a player, I want non-matching vehicles with clear paths to move into a limited dock so I can temporarily store them and free the right vehicle later.

**Why this priority**: The dock creates the level's main constraint and strategy. It turns simple matching into a puzzle with meaningful risk.

**Independent Test**: Can be fully tested by tapping an unblocked vehicle whose color does not match the next passenger and confirming that it moves into an available dock slot while staying available for later resolution.

**Acceptance Scenarios**:

1. **Given** the next passenger does not match the tapped vehicle's color and the dock has an open slot, **When** the player taps an unblocked vehicle, **Then** that vehicle moves into the dock and the passenger queue remains unchanged.
2. **Given** the dock contains stored vehicles and the next passenger later matches one of them, **When** the player taps that stored vehicle, **Then** it resolves from the dock without needing to return to the parking lot first.

---

### User Story 3 - Reach a clear end state (Priority: P3)

As a player, I want the level to clearly tell me when I have won or lost so I understand the outcome and can quickly try again.

**Why this priority**: A short-session puzzle needs unambiguous endings so players can learn from the result and replay without confusion.

**Independent Test**: Can be fully tested by playing through one winning run and one losing run, confirming that each produces a distinct outcome message and stops normal gameplay interactions until the player restarts or exits.

**Acceptance Scenarios**:

1. **Given** all passengers in the queue have been matched and removed, **When** the final required vehicle is resolved, **Then** the player sees a win state and the level stops accepting normal move input.
2. **Given** the dock is at capacity and the player attempts a move that would send another non-matching vehicle there, **When** that move is made, **Then** the player sees a loss state and the level stops accepting normal move input.
3. **Given** no vehicle in the parking lot or dock can legally satisfy the next state of play, **When** the level detects that no legal move remains, **Then** the player sees a loss state immediately and the level stops accepting normal move input.
4. **Given** the player starts a new attempt after a win or loss, **When** the level restarts, **Then** the parking lot, passenger queue, and dock reset to the same fixed opening state.

---

### Edge Cases

- If every remaining vehicle is blocked or no legal move can advance the level before the dock is full, the level ends in an immediate loss rather than leaving the player stuck.
- The level must allow a docked vehicle to resolve only when the player taps it after it becomes the correct next match, even if other docked vehicles still do not match.
- The level must award a win when the final passenger is cleared by a vehicle coming from the dock as well as from the parking lot.
- Repeated taps after a win or loss must not change the board, queue, or dock state.

## Constitution Alignment *(mandatory)*

- **Telegram Surface Impact**: This feature lives in the Mini App play surface and must remain readable and touch-friendly in portrait orientation. It does not change bot launch or sharing flows, but it does introduce the first real gameplay interactions that must still behave safely if opened outside Telegram during local development.
- **Gameplay Value**: This work directly establishes the project's core playable loop: reading the board, choosing a legal move, managing a limited dock, and reaching a win or loss result in a short session.
- **Storage & Durability**: Level state for this feature is session-local gameplay state only. No new durable storage, external services, or production persistence are required for a single playable level.
- **Verification Plan**: Validate the specification through review of prioritized user stories, acceptance scenarios, edge cases, and measurable outcomes. During implementation, use the existing `pnpm build` script, attempt the existing `pnpm lint` script, and manually verify win, loss, blocked-move, dock, and queue behaviors inside the Mini App surface.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present one playable level containing a visible parking lot of colored vehicles, a visible passenger queue ordered from next to last, and a visible dock with a fixed capacity of 3 slots.
- **FR-002**: The system MUST allow the player to attempt moves by tapping vehicles in the parking lot.
- **FR-003**: The system MUST move a tapped vehicle out of the parking lot only when that vehicle's exit path is fully clear.
- **FR-004**: The system MUST leave a tapped vehicle in place when its path is blocked and MUST communicate that the move did not resolve.
- **FR-005**: The system MUST compare each legal vehicle move against the next passenger in the queue only, not against later passengers.
- **FR-006**: When a legal move matches the next passenger's color, the system MUST remove that vehicle from play and remove the first passenger from the queue as a successful exit.
- **FR-007**: When a legal move does not match the next passenger's color and the dock has space, the system MUST place that vehicle into the dock and keep the passenger queue unchanged.
- **FR-008**: The system MUST treat dock capacity as a hard limit and MUST trigger a loss state when gameplay would require storing a non-matching vehicle after the dock is full.
- **FR-009**: The system MUST allow docked vehicles to satisfy the next passenger when their color becomes the required next match.
- **FR-010**: The system MUST require an explicit player tap to resolve a docked vehicle after it becomes the required next match.
- **FR-011**: The system MUST trigger a win state as soon as the passenger queue is empty.
- **FR-012**: The system MUST clearly display the current number of occupied dock slots throughout play.
- **FR-013**: The system MUST prevent further normal move input after a win or loss state until the player starts a new attempt or leaves the level.
- **FR-014**: The system MUST provide a way to begin the level again after a completed attempt.
- **FR-015**: The system MUST trigger a loss state immediately when no legal move remains that can advance the level.
- **FR-016**: The system MUST restart completed attempts using the same fixed opening layout, passenger order, and dock state for every replay of this level.

### Key Entities *(include if feature involves data)*

- **Vehicle**: A colored movable piece positioned in the parking lot or dock, with a current location and a status of blocked, movable, docked, or resolved.
- **Passenger Queue**: The ordered list of passengers waiting for vehicle colors, where only the first passenger determines the currently valid match.
- **Dock**: A set of 3 temporary holding slots for legal non-matching vehicles that have left the parking lot but are not yet resolved.
- **Level Attempt**: The current play session state, including remaining vehicles, queue progress, dock occupancy, and whether the player is still active, has won, or has lost.
- **Level Layout**: The fixed opening arrangement of vehicles, passenger order, and empty dock used at the start of every attempt of this level.

### Assumptions

- The level is designed as a single-player puzzle with one active attempt at a time.
- Color matching is exact and based on clearly distinguishable vehicle and passenger colors.
- A completed attempt includes an obvious replay path so players can quickly retry after learning from the outcome.
- The first playable level uses a single predefined puzzle setup rather than generated variations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation sessions, players can complete a full attempt of the level, ending in either a win or loss, in under 3 minutes without needing external instructions.
- **SC-002**: In validation sessions, 100% of taps on blocked vehicles leave the board state unchanged and visibly avoid being interpreted as successful moves.
- **SC-003**: In validation sessions, 100% of legal matching moves remove exactly one passenger from the front of the queue and one vehicle from active play.
- **SC-004**: In validation sessions, 100% of legal non-matching moves either occupy one dock slot or immediately produce a loss when no dock slot remains.
- **SC-005**: In validation sessions with first-time testers, at least 80% can correctly explain why they won or lost after a single completed attempt.
