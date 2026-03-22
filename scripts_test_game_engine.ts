import assert from "node:assert/strict";
import {
  canVehicleEscape,
  createGameState,
  escapeVehicle,
  getHintSuggestion,
  isWinningState,
  moveVehicle,
  resetGame,
  undoMove,
  validateMove,
} from "./app/lib/game";
import {
  LAUNCH_LEVEL_PACK,
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

runTest("solves each launch level and keeps a gentle difficulty ramp", () => {
  const moveCounts = LAUNCH_LEVEL_PACK.levels.map((level) => {
    const solution = solveLevel(level);
    assert.ok(solution, `Expected ${level.levelId} to be solvable.`);
    return solution.minimumMoves;
  });

  for (let index = 1; index < moveCounts.length; index += 1) {
    assert.ok(
      moveCounts[index] >= moveCounts[index - 1],
      `Expected ${LAUNCH_LEVEL_PACK.levels[index].levelId} to be at least as hard as the previous level.`,
    );
  }
});

runTest("provides level lookup and progression helpers", () => {
  const level = getLevelById("tutorial-04");
  assert.ok(level);
  assert.equal(level?.levelId, "tutorial-04");

  const summaries = getLevelSummaries();
  assert.equal(summaries.length, 10);
  assert.deepEqual(summaries[0], {
    levelId: "tutorial-01",
    boardWidth: 6,
    boardHeight: 6,
    themeId: "sunny-lot",
    starThresholds: { threeStars: 1, twoStars: 2, oneStar: 3 },
    vehicleCount: 3,
  });

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
