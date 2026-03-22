import { createGameState, moveVehicle, validateMove } from "../game";
import type { GameState, MoveInput } from "../game";
import type { LevelDefinition, SolvedLevelResult } from "./types";
import { toGameVehicleState } from "./types";

function serializeState(state: GameState) {
  return state.vehicles
    .map((vehicle) => `${vehicle.id}:${vehicle.x},${vehicle.y}`)
    .sort()
    .join("|");
}

function enumerateMoves(state: GameState): MoveInput[] {
  const moves: MoveInput[] = [];

  for (const vehicle of state.vehicles) {
    for (const direction of [-1, 1] as const) {
      let distance = direction;
      while (true) {
        const validation = validateMove(state, { vehicleId: vehicle.id, distance });
        if (!validation.ok) {
          break;
        }

        moves.push({ vehicleId: vehicle.id, distance });
        distance += direction;
      }
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
      const result = moveVehicle(current.state, move);
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
        moves: [...current.moves, { vehicleId: move.vehicleId, distance: move.distance }],
      });
    }
  }

  return null;
}
