import type {
  BoardOccupancy,
  CreateGameStateInput,
  ExitPosition,
  GameState,
  MoveInput,
  MoveResult,
  MoveValidationResult,
  UndoResult,
  VehicleFacing,
  VehicleState,
} from "./types";

function cloneVehicles(vehicles: VehicleState[]) {
  return vehicles.map((vehicle) => ({ ...vehicle }));
}

function toCoordinateKey(x: number, y: number) {
  return `${x},${y}`;
}

function getForwardStep(facing: VehicleFacing) {
  switch (facing) {
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    default:
      return { x: 0, y: 0 };
  }
}

function isFacingCompatible(vehicle: VehicleState) {
  return (
    (vehicle.orientation === "horizontal" && (vehicle.facing === "left" || vehicle.facing === "right")) ||
    (vehicle.orientation === "vertical" && (vehicle.facing === "up" || vehicle.facing === "down"))
  );
}

function getForwardSign(vehicle: VehicleState) {
  return vehicle.facing === "left" || vehicle.facing === "up" ? -1 : 1;
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

  if (!isFacingCompatible(vehicle)) {
    throw new Error(`Vehicle ${vehicle.id} must face along its movement axis.`);
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
  const signedDistance = distance * getForwardSign(vehicle);
  return vehicle.orientation === "horizontal"
    ? { ...vehicle, x: vehicle.x + signedDistance }
    : { ...vehicle, y: vehicle.y + signedDistance };
}

function getLeadingEdgeCell(vehicle: VehicleState, stepDistance: number) {
  const forwardSign = getForwardSign(vehicle);
  const signedDistance = stepDistance * forwardSign;

  if (vehicle.orientation === "horizontal") {
    return signedDistance > 0
      ? { x: vehicle.x + vehicle.length - 1 + signedDistance, y: vehicle.y }
      : { x: vehicle.x + signedDistance, y: vehicle.y };
  }

  return signedDistance > 0
    ? { x: vehicle.x, y: vehicle.y + vehicle.length - 1 + signedDistance }
    : { x: vehicle.x, y: vehicle.y + signedDistance };
}

function isCoordinateInsideBoard(state: GameState, coordinate: { x: number; y: number }) {
  return (
    coordinate.x >= 0 &&
    coordinate.y >= 0 &&
    coordinate.x < state.board.width &&
    coordinate.y < state.board.height
  );
}

function canTargetEscapeThroughExit(state: GameState, vehicle: VehicleState) {
  switch (state.exit.side) {
    case "left":
      return vehicle.orientation === "horizontal" && vehicle.facing === "left" && vehicle.y === state.exit.row;
    case "right":
      return vehicle.orientation === "horizontal" && vehicle.facing === "right" && vehicle.y === state.exit.row;
    case "top":
      return vehicle.orientation === "vertical" && vehicle.facing === "up" && vehicle.x === state.exit.column;
    case "bottom":
      return vehicle.orientation === "vertical" && vehicle.facing === "down" && vehicle.x === state.exit.column;
    default:
      return false;
  }
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

  if (move.distance < 0) {
    return {
      ok: false,
      reason: "wrong_direction",
      message: `Vehicle ${vehicle.id} can only move forward.`,
    };
  }

  const occupancy = buildBoardOccupancy(state.vehicles);
  occupancy.byCoordinate.forEach((_, coordinateKey) => {
    if (occupancy.byCoordinate.get(coordinateKey) === vehicle.id) {
      occupancy.byCoordinate.delete(coordinateKey);
    }
  });

  for (let stepIndex = 1; stepIndex <= move.distance; stepIndex += 1) {
    const nextCell = getLeadingEdgeCell(vehicle, stepIndex);

    if (!isCoordinateInsideBoard(state, nextCell)) {
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
    direction: "forward",
    distance: move.distance,
  };
}

export function canVehicleEscape(state: GameState, vehicleId: string) {
  const vehicle = getVehicleById(state, vehicleId);
  if (!vehicle) {
    return null;
  }

  if (vehicle.id === state.targetVehicleId && !canTargetEscapeThroughExit(state, vehicle)) {
    return null;
  }

  const occupancy = buildBoardOccupancy(state.vehicles);
  occupancy.byCoordinate.forEach((_, coordinateKey) => {
    if (occupancy.byCoordinate.get(coordinateKey) === vehicle.id) {
      occupancy.byCoordinate.delete(coordinateKey);
    }
  });

  const step = getForwardStep(vehicle.facing);
  const frontCell =
    vehicle.orientation === "horizontal"
      ? vehicle.facing === "right"
        ? { x: vehicle.x + vehicle.length - 1, y: vehicle.y }
        : { x: vehicle.x, y: vehicle.y }
      : vehicle.facing === "down"
        ? { x: vehicle.x, y: vehicle.y + vehicle.length - 1 }
        : { x: vehicle.x, y: vehicle.y };

  let distance = 0;
  let current = frontCell;

  while (true) {
    current = { x: current.x + step.x, y: current.y + step.y };
    distance += 1;

    if (!isCoordinateInsideBoard(state, current)) {
      return { vehicle, distance };
    }

    const blockingVehicleId = occupancy.byCoordinate.get(toCoordinateKey(current.x, current.y));
    if (blockingVehicleId) {
      return null;
    }
  }
}

export function isWinningState(state: GameState) {
  const targetVehicle = getVehicleById(state, state.targetVehicleId);
  if (targetVehicle) {
    return false;
  }

  return state.history.some((record) => record.vehicleId === state.targetVehicleId && record.escaped);
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

export function escapeVehicle(state: GameState, vehicleId: string): MoveResult {
  const escapeRoute = canVehicleEscape(state, vehicleId);
  if (!escapeRoute) {
    return {
      ok: false,
      state,
      reason: "path_blocked",
      message: `Vehicle ${vehicleId} does not have a clear forward exit.`,
    };
  }

  const vehiclesBefore = cloneVehicles(state.vehicles);
  const vehiclesAfter = state.vehicles.filter((vehicle) => vehicle.id !== vehicleId).map((vehicle) => ({ ...vehicle }));
  const nextState: GameState = {
    ...state,
    vehicles: vehiclesAfter,
    history: [
      ...state.history,
      {
        vehicleId,
        distance: escapeRoute.distance,
        direction: "forward",
        vehiclesBefore,
        vehiclesAfter: cloneVehicles(vehiclesAfter),
        escaped: true,
      },
    ],
    moveCount: state.moveCount + 1,
  };

  const hasWon = vehicleId === state.targetVehicleId;
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
