import { canVehicleEscape, createGameState, escapeVehicle, moveVehicle, validateMove } from "../game";
import type { GameState, MoveInput } from "../game";
import type { LevelDefinition, SolvedLevelResult } from "./types";
import { toGameVehicleState } from "./types";

function serializeState(state: GameState) {
  return state.vehicles
    .map((vehicle) => `${vehicle.id}:${vehicle.x},${vehicle.y}`)
    .sort()
    .join("|");
}

function enumerateMoves(state: GameState): Array<MoveInput | { vehicleId: string; escape: true }> {
  const moves: Array<MoveInput | { vehicleId: string; escape: true }> = [];

  for (const vehicle of state.vehicles) {
    let distance = 1;
    while (true) {
      const validation = validateMove(state, { vehicleId: vehicle.id, distance });
      if (!validation.ok) {
        break;
      }

      moves.push({ vehicleId: vehicle.id, distance });
      distance += 1;
    }

    if (canVehicleEscape(state, vehicle.id)) {
      moves.push({ vehicleId: vehicle.id, escape: true });
    }
  }

  return moves;
}

export function solveLevel(level: LevelDefinition): SolvedLevelResult | null {
  const start = createGameState({
    board: { width: level.boardWidth, height: level.boardHeight },
    exit: level.exit,
    targetVehicleId: level.targetVehicleId,
    vehicles: level.vehicles.map(toGameVehicleState),
  });

  const visited = new Set<string>([serializeState(start)]);
  const queue: Array<{
    state: GameState;
    moves: Array<{ vehicleId: string; distance: number }>;
  }> = [{ state: start, moves: [] }];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    if (current.state.hasWon) {
      return {
        levelId: level.levelId,
        minimumMoves: current.moves.length,
        moves: current.moves,
      };
    }

    for (const move of enumerateMoves(current.state)) {
      const result = "escape" in move ? escapeVehicle(current.state, move.vehicleId) : moveVehicle(current.state, move);
      if (!result.ok) {
        continue;
      }

      const key = serializeState(result.state);
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push({
        state: result.state,
        moves: [...current.moves, { vehicleId: move.vehicleId, distance: "escape" in move ? result.move.distance : move.distance }],
      });
    }
  }

  return null;
}
