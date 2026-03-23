export type BoardSize = {
  width: number;
  height: number;
};

export type VehicleOrientation = "horizontal" | "vertical";

export type VehicleRole = "target" | "car" | "truck";

export type VehicleFacing = "left" | "right" | "up" | "down";

export type VehicleState = {
  id: string;
  x: number;
  y: number;
  length: number;
  orientation: VehicleOrientation;
  role: VehicleRole;
  facing: VehicleFacing;
};

export type ExitPosition =
  | {
      side: "left" | "right";
      row: number;
    }
  | {
      side: "top" | "bottom";
      column: number;
    };

export type BoardCell = {
  x: number;
  y: number;
  vehicleId: string;
};

export type BoardOccupancy = {
  cells: BoardCell[];
  byCoordinate: Map<string, string>;
};

export type MoveDirection = "forward";

export type MoveInput = {
  vehicleId: string;
  distance: number;
};

export type InvalidMoveReason =
  | "vehicle_not_found"
  | "invalid_distance"
  | "wrong_direction"
  | "path_blocked"
  | "out_of_bounds";

export type MoveValidationFailure = {
  ok: false;
  reason: InvalidMoveReason;
  message: string;
  blockedByVehicleId?: string;
  attemptedPosition?: { x: number; y: number };
};

export type MoveValidationSuccess = {
  ok: true;
  direction: MoveDirection;
  distance: number;
};

export type MoveValidationResult = MoveValidationFailure | MoveValidationSuccess;

export type MoveRecord = {
  vehicleId: string;
  distance: number;
  direction: MoveDirection;
  vehiclesBefore: VehicleState[];
  vehiclesAfter: VehicleState[];
  escaped?: boolean;
};

export type HintRequest = {
  state: GameState;
};

export type HintSuggestion = {
  vehicleId: string;
  distance: number;
  explanation: string;
};

export type HintProvider = (request: HintRequest) => HintSuggestion | null;

export type GameState = {
  board: BoardSize;
  exit: ExitPosition;
  targetVehicleId: string;
  vehicles: VehicleState[];
  initialVehicles: VehicleState[];
  history: MoveRecord[];
  moveCount: number;
  hasWon: boolean;
  hintProvider?: HintProvider;
};

export type CreateGameStateInput = {
  board: BoardSize;
  exit: ExitPosition;
  targetVehicleId: string;
  vehicles: VehicleState[];
  hintProvider?: HintProvider;
};

export type MoveResult =
  | {
      ok: true;
      state: GameState;
      move: MoveRecord;
      hasWon: boolean;
    }
  | {
      ok: false;
      state: GameState;
      reason: InvalidMoveReason;
      message: string;
      blockedByVehicleId?: string;
      attemptedPosition?: { x: number; y: number };
    };

export type UndoResult =
  | {
      ok: true;
      state: GameState;
      undoneMove: MoveRecord;
    }
  | {
      ok: false;
      state: GameState;
      message: string;
    };
