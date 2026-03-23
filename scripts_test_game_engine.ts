import assert from "node:assert/strict";
import {
  createGameState,
  getHintSuggestion,
  getLegalMoves,
  isWinningState,
  moveVehicle,
  resetGame,
  undoMove,
  validateMove,
} from "./app/lib/game";
import {
  LAUNCH_LEVEL_PACK,
  createGameStateFromLevel,
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
    passengerQueue: ["sun", "mint", "sun"],
    vehicles: [
      { id: "sun-car", x: 0, y: 3, length: 2, orientation: "horizontal", colorKey: "sun", capacity: 2, occupancy: 0 },
      { id: "mint-car", x: 4, y: 3, length: 2, orientation: "vertical", colorKey: "mint", capacity: 1, occupancy: 0 },
      { id: "blocker", x: 2, y: 0, length: 3, orientation: "vertical", colorKey: "berry", capacity: 1, occupancy: 0 },
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

runTest("allows legal axis moves and applies boarding resolution", () => {
  const state = createSampleGame();
  const result = moveVehicle(state, { vehicleId: "sun-car", delta: 2 });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.state.moveCount, 1);
  assert.equal(result.move.boardingEvents[0]?.type, "boarded");
  assert.equal(result.state.passengerQueue.length, 0);
  assert.equal(result.state.hasWon, true);
  assert.equal(result.state.vehicles.some((vehicle) => vehicle.id === "sun-car"), false);
});

runTest("rejects blocked moves with structured details", () => {
  const state = createSampleGame();
  const validation = validateMove(state, { vehicleId: "sun-car", delta: 3 });

  assert.deepEqual(validation, {
    ok: false,
    reason: "path_blocked",
    message: "Vehicle sun-car is blocked by vehicle mint-car.",
    blockedByVehicleId: "mint-car",
    attemptedPosition: { x: 4, y: 3 },
  });
});

runTest("rejects out-of-bounds movement", () => {
  const state = createSampleGame();
  const result = moveVehicle(state, { vehicleId: "mint-car", delta: 3 });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.reason, "out_of_bounds");
});

runTest("prevents overlapping vehicles during game creation", () => {
  assert.throws(
    () =>
      createSampleGame({
        vehicles: [
          { id: "a", x: 0, y: 0, length: 2, orientation: "horizontal", colorKey: "sun", capacity: 1, occupancy: 0 },
          { id: "b", x: 1, y: 0, length: 2, orientation: "vertical", colorKey: "mint", capacity: 1, occupancy: 0 },
        ],
      }),
    /overlaps vehicle a/,
  );
});

runTest("removes full cars from the board and frees their cells", () => {
  const state = createGameState({
    board: { width: 6, height: 6 },
    passengerQueue: ["sun"],
    vehicles: [
      { id: "sun-car", x: 0, y: 3, length: 2, orientation: "horizontal", colorKey: "sun", capacity: 1, occupancy: 0 },
      { id: "blocker", x: 4, y: 3, length: 2, orientation: "vertical", colorKey: "mint", capacity: 1, occupancy: 0 },
    ],
  });

  const result = moveVehicle(state, { vehicleId: "sun-car", delta: 1 });
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.state.vehicles.some((vehicle) => vehicle.id === "sun-car"), false);
  assert.equal(result.state.passengerQueue.length, 0);
  assert.equal(result.state.hasWon, true);
  assert.equal(isWinningState(result.state), true);
});

runTest("supports deterministic undo and reset with queue restoration", () => {
  const start = createGameState({
    board: { width: 6, height: 6 },
    passengerQueue: ["sun", "mint"],
    vehicles: [
      { id: "sun-car", x: 0, y: 3, length: 2, orientation: "horizontal", colorKey: "sun", capacity: 1, occupancy: 0 },
      { id: "mint-car", x: 2, y: 4, length: 2, orientation: "horizontal", colorKey: "mint", capacity: 1, occupancy: 0 },
      { id: "blocker", x: 0, y: 1, length: 2, orientation: "horizontal", colorKey: "berry", capacity: 1, occupancy: 0 },
      { id: "blocker-2", x: 2, y: 2, length: 2, orientation: "horizontal", colorKey: "ocean", capacity: 1, occupancy: 0 },
    ],
  });

  const firstMove = moveVehicle(start, { vehicleId: "sun-car", delta: 2 });
  assert.equal(firstMove.ok, true);
  if (!firstMove.ok) {
    return;
  }

  const secondMove = moveVehicle(firstMove.state, { vehicleId: "blocker-2", delta: 2 });
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
  assert.deepEqual(undoResult.state.passengerQueue, ["sun", "mint"]);

  const resetState = resetGame(undoResult.state);
  assert.equal(resetState.moveCount, 0);
  assert.equal(resetState.history.length, 0);
  assert.deepEqual(resetState.passengerQueue, start.initialPassengerQueue);
  assert.deepEqual(resetState.vehicles, start.initialVehicles);
});

runTest("enumerates legal moves along both directions of each car axis", () => {
  const state = createSampleGame();
  const moves = getLegalMoves(state);
  assert.ok(moves.some((move) => move.vehicleId === "sun-car" && move.delta === 1));
  assert.ok(moves.some((move) => move.vehicleId === "mint-car" && move.delta === -3));
  assert.ok(!moves.some((move) => move.vehicleId === "blocker" && move.delta === -1));
});

runTest("finds a bfs-based hint on live board states", () => {
  const state = createSampleGame({
    hintProvider: undefined,
  });

  const hint = getHintSuggestion(state);
  assert.ok(hint);
  assert.equal(hint?.vehicleId, "sun-car");
  assert.ok((hint?.delta ?? 0) > 0);
});

console.log("All deterministic puzzle engine checks passed.");

runTest("validates every launch level schema", () => {
  assert.equal(LAUNCH_LEVEL_PACK.levels.length, 10);

  for (const level of LAUNCH_LEVEL_PACK.levels) {
    const validation = validateLevelDefinition(level);
    assert.equal(validation.ok, true, validation.ok ? undefined : validation.errors.join(" "));
  }
});

runTest("solves each handcrafted launch level", () => {
  for (const level of LAUNCH_LEVEL_PACK.levels) {
    const solution = solveLevel(level);
    assert.ok(solution, `Expected ${level.levelId} to be solvable.`);
    assert.ok((solution?.minimumMoves ?? 0) >= 1);
  }
});

runTest("provides level lookup, progression, and state helpers", () => {
  const level = getLevelById("tutorial-04");
  assert.ok(level);
  assert.equal(level?.levelId, "tutorial-04");
  assert.deepEqual(level?.passengerQueue, ["berry", "mint", "berry", "gold"]);

  const summaries = getLevelSummaries();
  assert.equal(summaries.length, 10);
  assert.deepEqual(summaries[0], {
    levelId: "tutorial-01",
    boardWidth: 6,
    boardHeight: 6,
    themeId: "sunrise-lot",
    starThresholds: { threeStars: 1, twoStars: 2, oneStar: 3 },
    vehicleCount: 3,
    passengerCount: 2,
  });

  const gameState = createGameStateFromLevel("tutorial-09");
  assert.equal(gameState.passengerQueue.length, 8);
  assert.equal(gameState.vehicles.length, 9);

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
