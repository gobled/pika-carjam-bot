import {
  canVehicleEscape,
  createColorMatchState,
  createGameState,
  escapeVehicle,
  moveVehicle,
  resolveEscapedVehicle,
  serializeColorMatchState,
  validateMove,
} from "../game";
import type { ColorMatchState, GameState, MoveInput } from "../game";
import type { LevelDefinition, SolvedLevelResult } from "./types";
import { toGameVehicleState } from "./types";

function serializeBoardState(state: GameState) {
  return state.vehicles
    .map((vehicle) => `${vehicle.id}:${vehicle.x},${vehicle.y}`)
    .sort()
    .join("|");
}

function serializeCombinedState(boardState: GameState, colorState: ColorMatchState) {
  return `${serializeBoardState(boardState)}||${serializeColorMatchState(colorState)}`;
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
  const startBoardState = createGameState({
    board: { width: level.boardWidth, height: level.boardHeight },
    exit: level.exit,
    targetVehicleId: level.targetVehicleId,
    vehicles: level.vehicles.map(toGameVehicleState),
  });
  const startColorState = createColorMatchState({
    passengerQueue: level.passengerQueue,
    dockSlots: level.dockSlots,
  });

  const visited = new Set<string>([serializeCombinedState(startBoardState, startColorState)]);
  const queue: Array<{
    boardState: GameState;
    colorState: ColorMatchState;
    moves: Array<{ vehicleId: string; distance: number }>;
  }> = [{ boardState: startBoardState, colorState: startColorState, moves: [] }];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    if (current.colorState.isComplete) {
      return {
        levelId: level.levelId,
        minimumMoves: current.moves.length,
        moves: current.moves,
      };
    }

    if (current.colorState.isFailed) {
      continue;
    }

    for (const move of enumerateMoves(current.boardState)) {
      if ("escape" in move) {
        const vehicle = level.vehicles.find((entry) => entry.id === move.vehicleId);
        if (!vehicle?.colorKey) {
          continue;
        }

        const boardResult = escapeVehicle(current.boardState, move.vehicleId);
        if (!boardResult.ok) {
          continue;
        }

        const colorResult = resolveEscapedVehicle(current.colorState, {
          vehicleId: move.vehicleId,
          colorKey: vehicle.colorKey,
        });

        if (colorResult.state.isFailed) {
          continue;
        }

        const key = serializeCombinedState(boardResult.state, colorResult.state);
        if (visited.has(key)) {
          continue;
        }

        visited.add(key);
        queue.push({
          boardState: boardResult.state,
          colorState: colorResult.state,
          moves: [...current.moves, { vehicleId: move.vehicleId, distance: boardResult.move.distance }],
        });
        continue;
      }

      const boardResult = moveVehicle(current.boardState, move);
      if (!boardResult.ok) {
        continue;
      }

      const key = serializeCombinedState(boardResult.state, current.colorState);
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push({
        boardState: boardResult.state,
        colorState: current.colorState,
        moves: [...current.moves, { vehicleId: move.vehicleId, distance: move.distance }],
      });
    }
  }

  return null;
}
