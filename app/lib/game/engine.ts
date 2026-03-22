import type {
  BoardOccupancy,
  CreateGameStateInput,
  ExitPosition,
  GameState,
  MoveInput,
  MoveResult,
  MoveValidationResult,
  UndoResult,
  VehicleState,
} from "./types";

function cloneVehicles(vehicles: VehicleState[]) {
  return vehicles.map((vehicle) => ({ ...vehicle }));
}

function toCoordinateKey(x: number, y: number) {
  return `${x},${y}`;
}

export function getVehicleCells(vehicle: VehicleState) {
  return Array.from({ length: vehicle.length }, (_, offset) => ({
    x: vehicle.orientation === "horizontal" ? vehicle.x + offset : vehicle.x,
    y: vehicle.orientation === "vertical" ? vehicle.y + offset : vehicle.y,
    vehicleId: vehicle.id,
  }));
}

export function buildBoardOccupancy(vehicles: VehicleState[]): BoardOccupancy {
  const byCoordinate = new Map<string, string>();
  const cells = vehicles.flatMap((vehicle) => getVehicleCells(vehicle));

  for (const cell of cells) {
    byCoordinate.set(toCoordinateKey(cell.x, cell.y), cell.vehicleId);
  }

  return { cells, byCoordinate };
}

function assertBoardSize(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Board size must use positive integer dimensions.");
  }
}

function assertVehicleShape(vehicle: VehicleState) {
  if (!Number.isInteger(vehicle.length) || vehicle.length < 2) {
    throw new Error(`Vehicle ${vehicle.id} must have an integer length of at least 2.`);
  }

  if (!Number.isInteger(vehicle.x) || !Number.isInteger(vehicle.y)) {
    throw new Error(`Vehicle ${vehicle.id} must use integer coordinates.`);
  }
}

function assertExitWithinBoard(exit: ExitPosition, board: GameState["board"]) {
  if ((exit.side === "left" || exit.side === "right") && (exit.row < 0 || exit.row >= board.height)) {
    throw new Error("Exit row is outside the board.");
  }

  if ((exit.side === "top" || exit.side === "bottom") && (exit.column < 0 || exit.column >= board.width)) {
    throw new Error("Exit column is outside the board.");
  }
}

function assertVehiclesFitBoard(vehicles: VehicleState[], board: GameState["board"]) {
  const occupiedCoordinates = new Map<string, string>();

  for (const vehicle of vehicles) {
    assertVehicleShape(vehicle);

    for (const cell of getVehicleCells(vehicle)) {
      if (cell.x < 0 || cell.y < 0 || cell.x >= board.width || cell.y >= board.height) {
        throw new Error(`Vehicle ${vehicle.id} is outside the board at (${cell.x}, ${cell.y}).`);
      }

      const coordinateKey = toCoordinateKey(cell.x, cell.y);
      const blockingVehicleId = occupiedCoordinates.get(coordinateKey);

      if (blockingVehicleId) {
        throw new Error(`Vehicle ${vehicle.id} overlaps vehicle ${blockingVehicleId} at (${cell.x}, ${cell.y}).`);
      }

      occupiedCoordinates.set(coordinateKey, vehicle.id);
    }
  }
}

function getVehicleById(state: GameState, vehicleId: string) {
  return state.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
}

function moveVehicleByDistance(vehicle: VehicleState, distance: number): VehicleState {
  return vehicle.orientation === "horizontal"
    ? { ...vehicle, x: vehicle.x + distance }
    : { ...vehicle, y: vehicle.y + distance };
}

function getLeadingEdgeCell(vehicle: VehicleState, stepOffset: number) {
  if (vehicle.orientation === "horizontal") {
    return stepOffset > 0
      ? { x: vehicle.x + vehicle.length - 1 + stepOffset, y: vehicle.y }
      : { x: vehicle.x + stepOffset, y: vehicle.y };
  }

  return stepOffset > 0
    ? { x: vehicle.x, y: vehicle.y + vehicle.length - 1 + stepOffset }
    : { x: vehicle.x, y: vehicle.y + stepOffset };
}

export function validateMove(state: GameState, move: MoveInput): MoveValidationResult {
  const vehicle = getVehicleById(state, move.vehicleId);

  if (!vehicle) {
    return {
      ok: false,
      reason: "vehicle_not_found",
      message: `Vehicle ${move.vehicleId} does not exist on this board.`,
    };
  }

  if (!Number.isInteger(move.distance) || move.distance === 0) {
    return {
      ok: false,
      reason: "invalid_distance",
      message: "Moves must use a non-zero integer distance.",
    };
  }

  const occupancy = buildBoardOccupancy(state.vehicles);
  occupancy.byCoordinate.forEach((_, coordinateKey) => {
    if (occupancy.byCoordinate.get(coordinateKey) === vehicle.id) {
      occupancy.byCoordinate.delete(coordinateKey);
    }
  });

  const step = Math.sign(move.distance);
  const stepsToCheck = Math.abs(move.distance);

  for (let stepIndex = 1; stepIndex <= stepsToCheck; stepIndex += 1) {
    const nextCell = getLeadingEdgeCell(vehicle, step * stepIndex);

    if (
      nextCell.x < 0 ||
      nextCell.y < 0 ||
      nextCell.x >= state.board.width ||
      nextCell.y >= state.board.height
    ) {
      return {
        ok: false,
        reason: "out_of_bounds",
        message: `Vehicle ${vehicle.id} would leave the board.`,
        attemptedPosition: nextCell,
      };
    }

    const blockingVehicleId = occupancy.byCoordinate.get(toCoordinateKey(nextCell.x, nextCell.y));
    if (blockingVehicleId) {
      return {
        ok: false,
        reason: "path_blocked",
        message: `Vehicle ${vehicle.id} is blocked by vehicle ${blockingVehicleId}.`,
        blockedByVehicleId: blockingVehicleId,
        attemptedPosition: nextCell,
      };
    }
  }

  return {
    ok: true,
    direction: move.distance > 0 ? "forward" : "backward",
    distance: move.distance,
  };
}

export function isWinningState(state: GameState) {
  const targetVehicle = getVehicleById(state, state.targetVehicleId);
  if (!targetVehicle) {
    return false;
  }

  const targetCells = getVehicleCells(targetVehicle);

  switch (state.exit.side) {
    case "left": {
      const { row } = state.exit;
      return targetVehicle.orientation === "horizontal" && targetVehicle.x === 0 && targetCells.some((cell) => cell.y === row);
    }
    case "right": {
      const { row } = state.exit;
      return (
        targetVehicle.orientation === "horizontal" &&
        targetVehicle.x + targetVehicle.length - 1 === state.board.width - 1 &&
        targetCells.some((cell) => cell.y === row)
      );
    }
    case "top": {
      const { column } = state.exit;
      return targetVehicle.orientation === "vertical" && targetVehicle.y === 0 && targetCells.some((cell) => cell.x === column);
    }
    case "bottom": {
      const { column } = state.exit;
      return (
        targetVehicle.orientation === "vertical" &&
        targetVehicle.y + targetVehicle.length - 1 === state.board.height - 1 &&
        targetCells.some((cell) => cell.x === column)
      );
    }
    default:
      return false;
  }
}

export function createGameState(input: CreateGameStateInput): GameState {
  assertBoardSize(input.board.width, input.board.height);
  assertExitWithinBoard(input.exit, input.board);
  assertVehiclesFitBoard(input.vehicles, input.board);

  if (!input.vehicles.some((vehicle) => vehicle.id === input.targetVehicleId)) {
    throw new Error(`Target vehicle ${input.targetVehicleId} does not exist.`);
  }

  const state: GameState = {
    board: { ...input.board },
    exit: { ...input.exit },
    targetVehicleId: input.targetVehicleId,
    vehicles: cloneVehicles(input.vehicles),
    initialVehicles: cloneVehicles(input.vehicles),
    history: [],
    moveCount: 0,
    hasWon: false,
    hintProvider: input.hintProvider,
  };

  state.hasWon = isWinningState(state);
  return state;
}

export function moveVehicle(state: GameState, move: MoveInput): MoveResult {
  const validation = validateMove(state, move);
  if (!validation.ok) {
    return {
      ok: false,
      state,
      reason: validation.reason,
      message: validation.message,
      blockedByVehicleId: validation.blockedByVehicleId,
      attemptedPosition: validation.attemptedPosition,
    };
  }

  const vehiclesBefore = cloneVehicles(state.vehicles);
  const vehiclesAfter = state.vehicles.map((vehicle) =>
    vehicle.id === move.vehicleId ? moveVehicleByDistance(vehicle, move.distance) : { ...vehicle },
  );

  const nextState: GameState = {
    ...state,
    vehicles: vehiclesAfter,
    history: [
      ...state.history,
      {
        vehicleId: move.vehicleId,
        distance: move.distance,
        direction: validation.direction,
        vehiclesBefore,
        vehiclesAfter: cloneVehicles(vehiclesAfter),
      },
    ],
    moveCount: state.moveCount + 1,
  };

  const hasWon = isWinningState(nextState);
  nextState.hasWon = hasWon;

  return {
    ok: true,
    state: nextState,
    move: nextState.history[nextState.history.length - 1],
    hasWon,
  };
}

export function resetGame(state: GameState): GameState {
  return {
    ...state,
    vehicles: cloneVehicles(state.initialVehicles),
    history: [],
    moveCount: 0,
    hasWon: false,
  };
}

export function undoMove(state: GameState): UndoResult {
  const undoneMove = state.history[state.history.length - 1];

  if (!undoneMove) {
    return {
      ok: false,
      state,
      message: "There are no moves to undo.",
    };
  }

  const nextState: GameState = {
    ...state,
    vehicles: cloneVehicles(undoneMove.vehiclesBefore),
    history: state.history.slice(0, -1),
    moveCount: Math.max(0, state.moveCount - 1),
    hasWon: false,
  };

  nextState.hasWon = isWinningState(nextState);

  return {
    ok: true,
    state: nextState,
    undoneMove,
  };
}

export function getHintSuggestion(state: GameState) {
  return state.hintProvider?.({ state }) ?? null;
}
