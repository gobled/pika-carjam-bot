# Data Model: Playable Puzzle Level

## Vehicle

- **Purpose**: Represents a colored movable piece that starts in the parking lot and can become docked or resolved.
- **Fields**:
  - `id`: unique identifier for a vehicle instance
  - `color`: exact match key shared with passenger color requirements
  - `orientation`: movement or shape orientation needed for layout and rendering
  - `length`: number of occupied parking cells
  - `cells`: occupied parking-grid coordinates while on the board
  - `exitLane`: direction or edge through which the vehicle can leave the lot
  - `location`: `parking`, `dock`, or `resolved`
  - `dockSlotIndex`: nullable slot position when the vehicle is stored in the dock
- **Validation Rules**:
  - `color` must match one of the supported queue colors
  - `cells` must remain within board bounds and must not overlap another active parked vehicle
  - `dockSlotIndex` is required only when `location = dock`
  - `dockSlotIndex` must be between `0` and `2`
- **State Transitions**:
  - `parking -> resolved` when tapped, path is clear, and color matches the next passenger
  - `parking -> dock` when tapped, path is clear, color does not match, and a dock slot is available
  - `dock -> resolved` when tapped and color matches the next passenger
  - No transition occurs for blocked or invalid taps

## Passenger Queue

- **Purpose**: Represents the ordered list of passenger color requests that define the only valid next match.
- **Fields**:
  - `passengers`: ordered list of passenger entries
  - `nextIndex`: index of the current required passenger, or equivalent front-of-queue representation
- **Passenger Entry Fields**:
  - `id`: unique identifier
  - `color`: required vehicle color
  - `position`: current display order
- **Validation Rules**:
  - Only the front passenger may be satisfied at any point
  - Queue order must remain stable except when the front passenger is removed by a successful resolution
- **State Transitions**:
  - Front passenger removed on successful matching resolution
  - Queue becomes empty to trigger a win

## Dock

- **Purpose**: Temporary holding area for legal non-matching vehicles that have left the parking lot.
- **Fields**:
  - `capacity`: fixed value of `3`
  - `slots`: ordered collection of up to three stored vehicle references
  - `occupiedCount`: derived or stored count used for UI display
- **Validation Rules**:
  - Stored vehicles keep their color identity and remain tappable
  - A new non-matching move cannot be stored when all 3 slots are occupied
- **State Transitions**:
  - Empty slot becomes occupied after a legal non-matching move from the lot
  - Occupied slot becomes empty when its vehicle resolves after a later matching tap
  - A required non-matching store attempt when full produces an immediate loss

## Level Layout

- **Purpose**: Defines the fixed opening puzzle for every attempt of the first playable level.
- **Fields**:
  - `boardSize`: parking lot width and height
  - `vehicles`: initial vehicle list with colors and occupied cells
  - `initialPassengerQueue`: fixed passenger color order
  - `dockCapacity`: fixed at 3
  - `metadata`: optional level id, title, or teaching intent
- **Validation Rules**:
  - Initial vehicles must fit the board and not overlap
  - The layout should support at least one winnable route and one losable route for validation
- **State Transitions**:
  - Immutable definition used to seed each new `LevelAttempt`

## Level Attempt

- **Purpose**: Represents the live session state of a single playthrough.
- **Fields**:
  - `layoutId`: reference to the fixed level definition
  - `vehicles`: current live vehicle collection
  - `passengerQueue`: current queue state
  - `dock`: current dock occupancy
  - `status`: `playing`, `won`, or `lost`
  - `lossReason`: nullable value such as `dock-full` or `no-legal-move`
  - `selectedFeedback`: transient UI feedback for blocked or invalid moves
- **Validation Rules**:
  - Only `playing` attempts accept normal move input
  - `won` or `lost` attempts must keep board, queue, and dock unchanged until restart
- **State Transitions**:
  - Initialized from `LevelLayout`
  - Remains `playing` after valid or invalid non-terminal taps
  - `playing -> won` when passenger queue becomes empty
  - `playing -> lost` when a non-matching vehicle must dock but no slot is available
  - `playing -> lost` when no legal move remains that can advance the level
  - Any completed state returns to a fresh `playing` attempt only through restart

## Derived Rule Concepts

### Move Legality

- A parking-lot vehicle is **blocked** when any occupied cell lies between it and its exit lane.
- A move is **legal** only when the tapped source is in an interactable location and the exit path is clear.
- A docked vehicle is legal to resolve only when its color matches the next passenger.

### Outcome Signals

- **Win**: queue length becomes `0`
- **Loss: dock full**: a non-matching legal move has no dock slot available
- **Loss: no legal move**: no parked or docked vehicle can legally advance the game state
