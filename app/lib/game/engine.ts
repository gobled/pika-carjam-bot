import type {
  BoardOccupancy,
  BoardingEvent,
  CreateGameStateInput,
  GameState,
  HintSuggestion,
  MoveInput,
  MoveRecord,
  MoveResult,
  MoveValidationResult,
  UndoResult,
  VehicleState,
} from "./types";

function cloneVehicles(vehicles: VehicleState[]) {
  return vehicles.map((vehicle) => ({ ...vehicle }));
}

function cloneQueue(queue: string[]) {
  return [...queue];
}

function toCoordinateKey(x: number, y: number) {
  return `${x},${y}`;
}

function getVehicleById(state: GameState, vehicleId: string) {
  return state.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
}

function getVehicleCells(vehicle: VehicleState) {
  return Array.from({ length: vehicle.length }, (_, offset) => ({
    x: vehicle.orientation === "horizontal" ? vehicle.x + offset : vehicle.x,
    y: vehicle.orientation === "vertical" ? vehicle.y + offset : vehicle.y,
    vehicleId: vehicle.id,
  }));
}

export function buildBoardOccupancy(vehicles: VehicleState[]): BoardOccupancy {
  const cells = vehicles.flatMap((vehicle) => getVehicleCells(vehicle));
  const byCoordinate = new Map<string, string>();

  for (const cell of cells) {
    byCoordinate.set(toCoordinateKey(cell.x, cell.y), cell.vehicleId);
  }

  return { cells, byCoordinate };
}

function assertBoardSize(input: CreateGameStateInput["board"]) {
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width <= 0 || input.height <= 0) {
    throw new Error("Board size must use positive integer dimensions.");
  }
}

function assertVehicle(vehicle: VehicleState) {
  if (!vehicle.id.trim()) {
    throw new Error("Each vehicle must have a non-empty id.");
  }

  if (!Number.isInteger(vehicle.x) || !Number.isInteger(vehicle.y)) {
    throw new Error(`Vehicle ${vehicle.id} must use integer coordinates.`);
  }

  if (!Number.isInteger(vehicle.length) || vehicle.length < 2) {
    throw new Error(`Vehicle ${vehicle.id} must have an integer length of at least 2.`);
  }

  if (!Number.isInteger(vehicle.capacity) || vehicle.capacity < 1) {
    throw new Error(`Vehicle ${vehicle.id} must have a capacity of at least 1.`);
  }

  if (!Number.isInteger(vehicle.occupancy) || vehicle.occupancy < 0 || vehicle.occupancy > vehicle.capacity) {
    throw new Error(`Vehicle ${vehicle.id} must start with occupancy between 0 and capacity.`);
  }

  if (!vehicle.colorKey.trim()) {
    throw new Error(`Vehicle ${vehicle.id} must define a colorKey.`);
  }
}

function assertVehiclesFitBoard(board: CreateGameStateInput["board"], vehicles: VehicleState[]) {
  const occupied = new Map<string, string>();

  for (const vehicle of vehicles) {
    assertVehicle(vehicle);

    for (const cell of getVehicleCells(vehicle)) {
      if (cell.x < 0 || cell.y < 0 || cell.x >= board.width || cell.y >= board.height) {
        throw new Error(`Vehicle ${vehicle.id} is outside the board at (${cell.x}, ${cell.y}).`);
      }

      const key = toCoordinateKey(cell.x, cell.y);
      const blocker = occupied.get(key);
      if (blocker) {
        throw new Error(`Vehicle ${vehicle.id} overlaps vehicle ${blocker} at (${cell.x}, ${cell.y}).`);
      }

      occupied.set(key, vehicle.id);
    }
  }
}

function finalizeState(state: Omit<GameState, "hasWon">): GameState {
  return {
    ...state,
    vehicles: cloneVehicles(state.vehicles),
    initialVehicles: cloneVehicles(state.initialVehicles),
    passengerQueue: cloneQueue(state.passengerQueue),
    initialPassengerQueue: cloneQueue(state.initialPassengerQueue),
    history: [...state.history],
    boardingEvents: [...state.boardingEvents],
    hasWon: state.passengerQueue.length === 0,
  };
}

export function createGameState(input: CreateGameStateInput): GameState {
  assertBoardSize(input.board);
  assertVehiclesFitBoard(input.board, input.vehicles);

  if (!Array.isArray(input.passengerQueue)) {
    throw new Error("passengerQueue must be an array.");
  }

  return finalizeState({
    board: { ...input.board },
    vehicles: cloneVehicles(input.vehicles),
    initialVehicles: cloneVehicles(input.vehicles),
    passengerQueue: cloneQueue(input.passengerQueue),
    initialPassengerQueue: cloneQueue(input.passengerQueue),
    history: [],
    moveCount: 0,
    boardingEvents: [],
    hintProvider: input.hintProvider,
  });
}

function isCoordinateInsideBoard(state: GameState, coordinate: { x: number; y: number }) {
  return coordinate.x >= 0 && coordinate.y >= 0 && coordinate.x < state.board.width && coordinate.y < state.board.height;
}

function getLeadingEdgeCell(vehicle: VehicleState, stepDelta: number) {
  if (vehicle.orientation === "horizontal") {
    return stepDelta > 0
      ? { x: vehicle.x + vehicle.length - 1 + stepDelta, y: vehicle.y }
      : { x: vehicle.x + stepDelta, y: vehicle.y };
  }

  return stepDelta > 0
    ? { x: vehicle.x, y: vehicle.y + vehicle.length - 1 + stepDelta }
    : { x: vehicle.x, y: vehicle.y + stepDelta };
}

function moveVehicleByDelta(vehicle: VehicleState, delta: number): VehicleState {
  return vehicle.orientation === "horizontal"
    ? { ...vehicle, x: vehicle.x + delta }
    : { ...vehicle, y: vehicle.y + delta };
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

  if (!Number.isInteger(move.delta) || move.delta === 0) {
    return {
      ok: false,
      reason: "invalid_delta",
      message: "Moves must use a non-zero integer delta.",
    };
  }

  const occupancy = buildBoardOccupancy(state.vehicles);
  for (const cell of getVehicleCells(vehicle)) {
    occupancy.byCoordinate.delete(toCoordinateKey(cell.x, cell.y));
  }

  const stepDirection = Math.sign(move.delta);
  const stepCount = Math.abs(move.delta);

  for (let stepIndex = 1; stepIndex <= stepCount; stepIndex += 1) {
    const nextCell = getLeadingEdgeCell(vehicle, stepIndex * stepDirection);

    if (!isCoordinateInsideBoard(state, nextCell)) {
      return {
        ok: false,
        reason: "out_of_bounds",
        message: `Vehicle ${vehicle.id} would leave the board.`,
        attemptedPosition: nextCell,
      };
    }

    const blocker = occupancy.byCoordinate.get(toCoordinateKey(nextCell.x, nextCell.y));
    if (blocker) {
      return {
        ok: false,
        reason: "path_blocked",
        message: `Vehicle ${vehicle.id} is blocked by vehicle ${blocker}.`,
        blockedByVehicleId: blocker,
        attemptedPosition: nextCell,
      };
    }
  }

  return { ok: true, delta: move.delta };
}

export function getLegalMoves(state: GameState): MoveInput[] {
  const moves: MoveInput[] = [];

  for (const vehicle of state.vehicles) {
    for (const direction of [-1, 1] as const) {
      let distance = 1;
      while (true) {
        const delta = direction * distance;
        const validation = validateMove(state, { vehicleId: vehicle.id, delta });
        if (!validation.ok) {
          break;
        }

        moves.push({ vehicleId: vehicle.id, delta });
        distance += 1;
      }
    }
  }

  return moves;
}

function hasClearPathToQueue(state: GameState, vehicle: VehicleState) {
  const occupancy = buildBoardOccupancy(state.vehicles);

  for (const cell of getVehicleCells(vehicle)) {
    let clear = true;
    for (let y = cell.y - 1; y >= 0; y -= 1) {
      const blocker = occupancy.byCoordinate.get(toCoordinateKey(cell.x, y));
      if (blocker && blocker !== vehicle.id) {
        clear = false;
        break;
      }
    }

    if (clear) {
      return true;
    }
  }

  return false;
}

function resolveBoarding(state: GameState) {
  let workingVehicles = cloneVehicles(state.vehicles);
  const workingQueue = cloneQueue(state.passengerQueue);
  const events: BoardingEvent[] = [];

  while (workingQueue.length > 0) {
    const nextColor = workingQueue[0];
    const candidate = workingVehicles.find(
      (vehicle) => vehicle.colorKey === nextColor && vehicle.occupancy < vehicle.capacity && hasClearPathToQueue({ ...state, vehicles: workingVehicles }, vehicle),
    );

    if (!candidate) {
      break;
    }

    candidate.occupancy += 1;
    workingQueue.shift();
    events.push({
      type: "boarded",
      vehicleId: candidate.id,
      colorKey: candidate.colorKey,
      queueColor: nextColor,
      occupancy: candidate.occupancy,
      capacity: candidate.capacity,
    });

    if (candidate.occupancy >= candidate.capacity) {
      workingVehicles = workingVehicles.filter((vehicle) => vehicle.id !== candidate.id);
      events.push({
        type: "departed",
        vehicleId: candidate.id,
        colorKey: candidate.colorKey,
        queueColor: nextColor,
        occupancy: candidate.capacity,
        capacity: candidate.capacity,
      });
    }
  }

  return {
    vehicles: workingVehicles,
    passengerQueue: workingQueue,
    events,
  };
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

  const movedVehicles = state.vehicles.map((vehicle) =>
    vehicle.id === move.vehicleId ? moveVehicleByDelta(vehicle, move.delta) : { ...vehicle },
  );

  const resolved = resolveBoarding({ ...state, vehicles: movedVehicles });

  const record: MoveRecord = {
    vehicleId: move.vehicleId,
    delta: move.delta,
    vehiclesBefore: cloneVehicles(state.vehicles),
    vehiclesAfter: cloneVehicles(resolved.vehicles),
    queueBefore: cloneQueue(state.passengerQueue),
    queueAfter: cloneQueue(resolved.passengerQueue),
    boardingEvents: [...resolved.events],
  };

  const nextState = finalizeState({
    board: { ...state.board },
    vehicles: resolved.vehicles,
    initialVehicles: state.initialVehicles,
    passengerQueue: resolved.passengerQueue,
    initialPassengerQueue: state.initialPassengerQueue,
    history: [...state.history, record],
    moveCount: state.moveCount + 1,
    boardingEvents: resolved.events,
    hintProvider: state.hintProvider,
  });

  return {
    ok: true,
    state: nextState,
    move: record,
    hasWon: nextState.hasWon,
  };
}

export function undoMove(state: GameState): UndoResult {
  const undoneMove = state.history[state.history.length - 1];
  if (!undoneMove) {
    return {
      ok: false,
      state,
      message: "No moves to undo yet.",
    };
  }

  return {
    ok: true,
    undoneMove,
    state: finalizeState({
      board: { ...state.board },
      vehicles: undoneMove.vehiclesBefore,
      initialVehicles: state.initialVehicles,
      passengerQueue: undoneMove.queueBefore,
      initialPassengerQueue: state.initialPassengerQueue,
      history: state.history.slice(0, -1),
      moveCount: Math.max(0, state.moveCount - 1),
      boardingEvents: [],
      hintProvider: state.hintProvider,
    }),
  };
}

export function resetGame(state: GameState) {
  return finalizeState({
    board: { ...state.board },
    vehicles: state.initialVehicles,
    initialVehicles: state.initialVehicles,
    passengerQueue: state.initialPassengerQueue,
    initialPassengerQueue: state.initialPassengerQueue,
    history: [],
    moveCount: 0,
    boardingEvents: [],
    hintProvider: state.hintProvider,
  });
}

export function isWinningState(state: GameState) {
  return state.hasWon;
}

function serializeState(state: GameState) {
  const board = state.vehicles
    .map((vehicle) => `${vehicle.id}:${vehicle.x},${vehicle.y},${vehicle.occupancy}`)
    .sort()
    .join("|");
  const queue = state.passengerQueue.join(",");
  return `${board}||${queue}`;
}

export function getHintSuggestion(state: GameState): HintSuggestion | null {
  if (state.hintProvider) {
    return state.hintProvider({ state });
  }

  if (state.hasWon) {
    return null;
  }

  const visited = new Set<string>([serializeState(state)]);
  const queue: Array<{ state: GameState; firstMove: MoveInput | null }> = [{ state, firstMove: null }];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.state.hasWon && current.firstMove) {
      return {
        vehicleId: current.firstMove.vehicleId,
        delta: current.firstMove.delta,
        explanation: `Move ${current.firstMove.vehicleId} by ${current.firstMove.delta > 0 ? `+${current.firstMove.delta}` : current.firstMove.delta} to open the pickup lane for the ${state.passengerQueue[0]} passenger.`,
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
        firstMove: current.firstMove ?? move,
      });
    }
  }

  const fallback = getLegalMoves(state)[0] ?? null;
  if (!fallback) {
    return null;
  }

  return {
    vehicleId: fallback.vehicleId,
    delta: fallback.delta,
    explanation: `Try moving ${fallback.vehicleId} by ${fallback.delta > 0 ? `+${fallback.delta}` : fallback.delta} to change the top boarding lanes.`,
  };
}
