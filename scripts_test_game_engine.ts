import assert from "node:assert/strict";
import {
  createGameState,
  getHintSuggestion,
  isWinningState,
  moveVehicle,
  resetGame,
  undoMove,
  validateMove,
} from "./app/lib/game";
import type { CreateGameStateInput } from "./app/lib/game";

function createSampleGame(overrides: Partial<CreateGameStateInput> = {}) {
  return createGameState({
    board: { width: 6, height: 6 },
    exit: { side: "right", row: 2 },
    targetVehicleId: "target",
    vehicles: [
      { id: "target", x: 1, y: 2, length: 2, orientation: "horizontal", role: "target" },
      { id: "truck", x: 4, y: 0, length: 3, orientation: "vertical", role: "truck" },
      { id: "car-a", x: 0, y: 0, length: 2, orientation: "horizontal", role: "car" },
      { id: "car-b", x: 5, y: 3, length: 2, orientation: "vertical", role: "car" },
    ],
    ...overrides,
  });
}

function runTest(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

runTest("allows valid moves and increments move history", () => {
  const state = createSampleGame();
  const result = moveVehicle(state, { vehicleId: "truck", distance: 1 });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(result.state.vehicles.find((vehicle) => vehicle.id === "truck"), {
    id: "truck",
    x: 4,
    y: 1,
    length: 3,
    orientation: "vertical",
    role: "truck",
  });
  assert.equal(result.state.moveCount, 1);
  assert.equal(result.state.history.length, 1);
  assert.equal(result.hasWon, false);
});

runTest("rejects blocked moves with a structured reason", () => {
  const state = createSampleGame();
  const validation = validateMove(state, { vehicleId: "target", distance: 2 });

  assert.deepEqual(validation, {
    ok: false,
    reason: "path_blocked",
    message: "Vehicle target is blocked by vehicle truck.",
    blockedByVehicleId: "truck",
    attemptedPosition: { x: 4, y: 2 },
  });
});

runTest("rejects out-of-bounds moves", () => {
  const state = createSampleGame();
  const result = moveVehicle(state, { vehicleId: "car-a", distance: -1 });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.reason, "out_of_bounds");
  assert.deepEqual(result.attemptedPosition, { x: -1, y: 0 });
  assert.deepEqual(state.vehicles.find((vehicle) => vehicle.id === "car-a"), {
    id: "car-a",
    x: 0,
    y: 0,
    length: 2,
    orientation: "horizontal",
    role: "car",
  });
});

runTest("prevents overlapping vehicles during game creation", () => {
  assert.throws(
    () =>
      createSampleGame({
        vehicles: [
          { id: "target", x: 1, y: 2, length: 2, orientation: "horizontal", role: "target" },
          { id: "overlap", x: 2, y: 2, length: 2, orientation: "vertical", role: "car" },
        ],
      }),
    /overlaps vehicle target/,
  );
});

runTest("detects the win condition when the target reaches the exit edge", () => {
  const state = createSampleGame({
    vehicles: [
      { id: "target", x: 3, y: 2, length: 2, orientation: "horizontal", role: "target" },
      { id: "support", x: 0, y: 0, length: 2, orientation: "horizontal", role: "car" },
    ],
  });

  const result = moveVehicle(state, { vehicleId: "target", distance: 1 });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.hasWon, true);
  assert.equal(isWinningState(result.state), true);
  assert.equal(result.state.hasWon, true);
});

runTest("supports undo and reset behavior deterministically", () => {
  const start = createSampleGame();
  const firstMove = moveVehicle(start, { vehicleId: "truck", distance: 1 });
  assert.equal(firstMove.ok, true);
  if (!firstMove.ok) {
    return;
  }

  const secondMove = moveVehicle(firstMove.state, { vehicleId: "target", distance: 1 });
  assert.equal(secondMove.ok, true);
  if (!secondMove.ok) {
    return;
  }

  const undoResult = undoMove(secondMove.state);
  assert.equal(undoResult.ok, true);
  if (!undoResult.ok) {
    return;
  }

  assert.equal(undoResult.state.moveCount, 1);
  assert.deepEqual(undoResult.state.vehicles.find((vehicle) => vehicle.id === "target"), {
    id: "target",
    x: 1,
    y: 2,
    length: 2,
    orientation: "horizontal",
    role: "target",
  });

  const resetState = resetGame(undoResult.state);
  assert.equal(resetState.moveCount, 0);
  assert.equal(resetState.history.length, 0);
  assert.deepEqual(resetState.vehicles, start.initialVehicles);
});

runTest("exposes a hint provider placeholder interface", () => {
  const state = createSampleGame({
    hintProvider: () => ({
      vehicleId: "target",
      distance: 1,
      explanation: "Slide the target car toward the exit.",
    }),
  });

  assert.deepEqual(getHintSuggestion(state), {
    vehicleId: "target",
    distance: 1,
    explanation: "Slide the target car toward the exit.",
  });
});

console.log("All deterministic puzzle engine checks passed.");
