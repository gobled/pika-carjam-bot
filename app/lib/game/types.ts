export type BoardSize = {
  width: number;
  height: number;
};

export type VehicleOrientation = "horizontal" | "vertical";

export type VehicleState = {
  id: string;
  x: number;
  y: number;
  length: number;
  orientation: VehicleOrientation;
  colorKey: string;
  capacity: number;
  occupancy: number;
  skinKey?: string;
};

export type PassengerColorKey = string;

export type MoveInput = {
  vehicleId: string;
  delta: number;
};

export type InvalidMoveReason =
  | "vehicle_not_found"
  | "invalid_delta"
  | "out_of_bounds"
  | "path_blocked";

export type MoveValidationFailure = {
  ok: false;
  reason: InvalidMoveReason;
  message: string;
  blockedByVehicleId?: string;
  attemptedPosition?: { x: number; y: number };
};

export type MoveValidationSuccess = {
  ok: true;
  delta: number;
};

export type MoveValidationResult = MoveValidationFailure | MoveValidationSuccess;

export type BoardCell = {
  x: number;
  y: number;
  vehicleId: string;
};

export type BoardOccupancy = {
  cells: BoardCell[];
  byCoordinate: Map<string, string>;
};

export type BoardingEvent = {
  type: "boarded" | "departed";
  vehicleId: string;
  colorKey: string;
  queueColor: string;
  occupancy: number;
  capacity: number;
};

export type MoveRecord = {
  vehicleId: string;
  delta: number;
  vehiclesBefore: VehicleState[];
  vehiclesAfter: VehicleState[];
  queueBefore: PassengerColorKey[];
  queueAfter: PassengerColorKey[];
  boardingEvents: BoardingEvent[];
};

export type HintSuggestion = {
  vehicleId: string;
  delta: number;
  explanation: string;
};

export type HintRequest = {
  state: GameState;
};

export type HintProvider = (request: HintRequest) => HintSuggestion | null;

export type GameState = {
  board: BoardSize;
  vehicles: VehicleState[];
  initialVehicles: VehicleState[];
  passengerQueue: PassengerColorKey[];
  initialPassengerQueue: PassengerColorKey[];
  history: MoveRecord[];
  moveCount: number;
  hasWon: boolean;
  boardingEvents: BoardingEvent[];
  hintProvider?: HintProvider;
};

export type CreateGameStateInput = {
  board: BoardSize;
  vehicles: VehicleState[];
  passengerQueue: PassengerColorKey[];
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
