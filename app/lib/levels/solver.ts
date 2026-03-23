import { createGameState, getLegalMoves, moveVehicle } from "../game";
import type { GameState } from "../game";
import type { LevelDefinition, SolvedLevelResult } from "./types";
import { toGameVehicleState } from "./types";

function serializeState(state: GameState) {
  const board = state.vehicles
    .map((vehicle) => `${vehicle.id}:${vehicle.x},${vehicle.y},${vehicle.occupancy}`)
    .sort()
    .join("|");
  return `${board}||${state.passengerQueue.join(",")}`;
}

export function solveLevel(level: LevelDefinition): SolvedLevelResult | null {
  const startState = createGameState({
    board: { width: level.boardWidth, height: level.boardHeight },
    vehicles: level.vehicles.map(toGameVehicleState),
    passengerQueue: level.passengerQueue,
  });

  const visited = new Set<string>([serializeState(startState)]);
  const queue: Array<{ state: GameState; moves: Array<{ vehicleId: string; delta: number }> }> = [
    { state: startState, moves: [] },
  ];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    if (current.state.hasWon) {
      return {
        levelId: level.levelId,
        minimumMoves: current.moves.length,
        moves: current.moves,
      };
    }

    for (const move of getLegalMoves(current.state)) {
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
        moves: [...current.moves, move],
      });
    }
  }

  return null;
}
