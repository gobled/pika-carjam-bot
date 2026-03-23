import assert from "node:assert/strict";
import {
  canVehicleEscape,
  createColorMatchState,
  createGameState,
  escapeVehicle,
  getHintSuggestion,
  isWinningState,
  moveVehicle,
  resetColorMatchState,
  resetGame,
  resolveEscapedVehicle,
  undoMove,
  validateMove,
} from "./app/lib/game";
import {
  LAUNCH_LEVEL_PACK,
  createColorMatchStateFromLevel,
  getLevelById,
  getLevelSummaries,
  getNextLevelMetadata,
  getStarRating,
  solveLevel,
  validateLevelDefinition,
} from "./app/lib/levels";
import type { CreateGameStateInput } from "./app/lib/game";

function createSampleGame(overrides: Partial<CreateGameStateInput> = {}) {
  return createGameState({
    board: { width: 6, height: 6 },
    exit: { side: "right", row: 2 },
    targetVehicleId: "target",
    vehicles: [
      { id: "target", x: 1, y: 2, length: 2, orientation: "horizontal", role: "target", facing: "right" },
      { id: "truck", x: 4, y: 0, length: 3, orientation: "vertical", role: "truck", facing: "down" },
      { id: "car-a", x: 0, y: 0, length: 2, orientation: "horizontal", role: "car", facing: "left" },
      { id: "car-b", x: 5, y: 3, length: 2, orientation: "vertical", role: "car", facing: "up" },
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

runTest("allows valid forward moves and increments move history", () => {
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
    facing: "down",
  });
  assert.equal(result.state.moveCount, 1);
  assert.equal(result.state.history.length, 1);
  assert.equal(result.hasWon, false);
});

runTest("rejects blocked forward moves with a structured reason", () => {
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

runTest("rejects backward moves", () => {
  const state = createSampleGame();
  const result = moveVehicle(state, { vehicleId: "car-a", distance: -1 });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.reason, "wrong_direction");
  assert.equal(result.message, "Vehicle car-a can only move forward.");
});

runTest("prevents overlapping vehicles during game creation", () => {
  assert.throws(
    () =>
      createSampleGame({
        vehicles: [
          { id: "target", x: 1, y: 2, length: 2, orientation: "horizontal", role: "target", facing: "right" },
          { id: "overlap", x: 2, y: 2, length: 2, orientation: "vertical", role: "car", facing: "up" },
        ],
      }),
    /overlaps vehicle target/,
  );
});

runTest("lets the target escape through the exit when its lane is clear", () => {
  const state = createSampleGame({
    vehicles: [
      { id: "target", x: 3, y: 2, length: 2, orientation: "horizontal", role: "target", facing: "right" },
      { id: "support", x: 0, y: 0, length: 2, orientation: "horizontal", role: "car", facing: "left" },
    ],
  });

  assert.ok(canVehicleEscape(state, "target"));

  const result = escapeVehicle(state, "target");
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.hasWon, true);
  assert.equal(isWinningState(result.state), true);
  assert.equal(result.state.hasWon, true);
  assert.equal(result.state.vehicles.some((vehicle) => vehicle.id === "target"), false);
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
    facing: "right",
  });

  const resetState = resetGame(undoResult.state);
  assert.equal(resetState.moveCount, 0);
  assert.equal(resetState.history.length, 0);
  assert.deepEqual(resetState.vehicles, start.initialVehicles);
});

runTest("tracks color matching, dock storage, and auto-release chains", () => {
  const start = createColorMatchState({
    passengerQueue: ["sun", "mint", "berry"],
    dockSlots: 2,
  });

  const firstEscape = resolveEscapedVehicle(start, { vehicleId: "wrong-first", colorKey: "mint" });
  assert.equal(firstEscape.outcome, "docked");
  assert.equal(firstEscape.state.dockedVehicles.length, 1);
  assert.deepEqual(firstEscape.state.passengerQueue, ["sun", "mint", "berry"]);

  const secondEscape = resolveEscapedVehicle(firstEscape.state, { vehicleId: "correct-now", colorKey: "sun" });
  assert.equal(secondEscape.outcome, "matched");
  assert.equal(secondEscape.autoDispatchedFromDock.length, 1);
  assert.deepEqual(secondEscape.state.passengerQueue, ["berry"]);
  assert.deepEqual(secondEscape.state.dispatchedVehicleIds, ["correct-now", "wrong-first"]);

  const finalEscape = resolveEscapedVehicle(secondEscape.state, { vehicleId: "final-car", colorKey: "berry" });
  assert.equal(finalEscape.state.isComplete, true);
  assert.equal(finalEscape.state.dockedVehicles.length, 0);
});

runTest("fails when a wrong-color escape overflows the dock", () => {
  const start = createColorMatchState({
    passengerQueue: ["sun", "mint"],
    dockSlots: 1,
  });

  const oneWrong = resolveEscapedVehicle(start, { vehicleId: "wrong-a", colorKey: "mint" });
  const overflow = resolveEscapedVehicle(oneWrong.state, { vehicleId: "wrong-b", colorKey: "mint" });

  assert.equal(overflow.outcome, "failed");
  assert.equal(overflow.state.isFailed, true);
  assert.equal(overflow.state.isComplete, false);
});

runTest("resets color match state back to the original queue", () => {
  const start = createColorMatchState({
    passengerQueue: ["sun", "mint"],
    dockSlots: 2,
  });
  const progressed = resolveEscapedVehicle(start, { vehicleId: "sun-car", colorKey: "sun" }).state;
  const reset = resetColorMatchState(progressed);

  assert.deepEqual(reset.passengerQueue, ["sun", "mint"]);
  assert.equal(reset.dockedVehicles.length, 0);
  assert.equal(reset.dispatchedVehicleIds.length, 0);
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

runTest("validates every launch level schema", () => {
  assert.equal(LAUNCH_LEVEL_PACK.levels.length, 10);

  for (const level of LAUNCH_LEVEL_PACK.levels) {
    const validation = validateLevelDefinition(level);
    assert.equal(validation.ok, true, validation.ok ? undefined : validation.errors.join(" "));
  }
});

runTest("solves each launch level with the color queue rules enabled", () => {
  for (const level of LAUNCH_LEVEL_PACK.levels) {
    const solution = solveLevel(level);
    assert.ok(solution, `Expected ${level.levelId} to be solvable.`);
    assert.ok((solution?.minimumMoves ?? 0) >= level.vehicles.length);
  }
});

runTest("provides level lookup, progression, and queue helpers", () => {
  const level = getLevelById("tutorial-04");
  assert.ok(level);
  assert.equal(level?.levelId, "tutorial-04");
  assert.deepEqual(level?.passengerQueue, ["mint", "ocean", "gold", "sun", "berry"]);

  const summaries = getLevelSummaries();
  assert.equal(summaries.length, 10);
  assert.deepEqual(summaries[0], {
    levelId: "tutorial-01",
    boardWidth: 6,
    boardHeight: 6,
    themeId: "sunny-lot",
    dockSlots: 2,
    starThresholds: { threeStars: 1, twoStars: 2, oneStar: 3 },
    vehicleCount: 3,
    passengerCount: 3,
  });

  const colorState = createColorMatchStateFromLevel("tutorial-09");
  assert.equal(colorState.dockSlots, 3);
  assert.equal(colorState.passengerQueue.length, 7);

  assert.deepEqual(getNextLevelMetadata("tutorial-10"), {
    currentLevelId: "tutorial-10",
    currentIndex: 9,
    totalLevels: 10,
    nextLevelId: null,
    hasNextLevel: false,
  });
});

runTest("computes star ratings from move thresholds", () => {
  const level = getLevelById("tutorial-06");
  assert.ok(level);
  if (!level) {
    return;
  }

  assert.equal(getStarRating(level, 4), 3);
  assert.equal(getStarRating(level, 6), 2);
  assert.equal(getStarRating(level, 8), 1);
  assert.equal(getStarRating(level, 9), 0);
});
