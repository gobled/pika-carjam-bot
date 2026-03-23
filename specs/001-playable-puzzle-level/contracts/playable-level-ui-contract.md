# Playable Level UI Contract

## Purpose

This contract defines the expected user-visible behavior for the first playable puzzle level inside the Mini App. It is the design-time contract between gameplay state logic and the React UI.

## Surface contract

When the player enters gameplay, the screen must present:

- a visible parking lot containing the fixed vehicle layout
- a visible passenger queue ordered from next to last
- a visible dock with exactly 3 slots
- a replay path after a completed attempt

The gameplay surface must remain readable in portrait orientation and must support touch-first interaction.

## Interaction contract

### Parking-lot vehicle tap

- **Precondition**: attempt status is `playing`
- **If blocked**:
  - vehicle remains in place
  - queue remains unchanged
  - dock remains unchanged
  - UI shows blocked or invalid-move feedback
- **If clear and matches next passenger**:
  - vehicle resolves from the lot
  - first passenger leaves the queue
  - UI updates to the next required passenger or win state
- **If clear and does not match next passenger while dock has space**:
  - vehicle moves into the next available dock slot
  - queue remains unchanged
  - dock occupancy display updates
- **If clear and does not match next passenger while dock is full**:
  - attempt enters loss state immediately
  - normal move input locks

### Docked vehicle tap

- **Precondition**: attempt status is `playing`
- **If the docked vehicle matches the next passenger**:
  - vehicle resolves from the dock
  - first passenger leaves the queue
- **If it does not match**:
  - state remains unchanged
  - UI may show invalid-move feedback

Docked vehicles must never auto-resolve without a tap.

## Outcome contract

### Win

- Triggered immediately when the passenger queue becomes empty
- UI must clearly communicate success
- Normal gameplay input must stop until restart or exit

### Loss

Loss is triggered immediately when either of these occurs:

- a non-matching legal move would require a fourth dock slot
- no legal move remains that can advance the level

The UI must clearly communicate the loss reason or at minimum make the failed outcome unambiguous.

## Restart contract

- Restart must create a fresh attempt from the same fixed opening layout
- Restart must restore the original passenger queue
- Restart must empty the dock
- Restart must re-enable normal move input

## State contract summary

```text
playing
├── tap blocked vehicle -> playing
├── tap matching clear vehicle -> playing or won
├── tap non-matching clear vehicle with dock space -> playing
├── tap non-matching clear vehicle with full dock -> lost
├── tap matching docked vehicle -> playing or won
└── no legal advancing move remains -> lost

won
└── restart -> playing

lost
└── restart -> playing
```
