export type VehicleColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange";

export type VehicleType = "sedan" | "minivan" | "bus" | "suv" | "truck";

export type VehicleOrientation = "horizontal" | "vertical";
export type ExitLane = "up" | "right" | "down" | "left";
export type VehicleLocation = "parking" | "dock" | "resolved";
export type AttemptStatus = "playing" | "won" | "lost";
export type LossReason = "no-legal-move" | null;
export type MoveFeedbackTone = "neutral" | "info" | "success" | "warning" | "danger";
export type MoveFeedbackCode =
  | "attempt-ready"
  | "attempt-reset"
  | "attempt-locked"
  | "blocked-vehicle"
  | "vehicle-sent-to-spot"
  | "vehicle-missing"
  | "spot-full-loss"
  | "no-legal-move-loss"
  | "win";
export type ParkingTapOutcome = "invalid" | "blocked" | "can-exit" | "spot-full-loss";

export type GridCell = {
  row: number;
  col: number;
};

export type Vehicle = {
  id: string;
  color: VehicleColor;
  type: VehicleType;
  seats: number;
  boardedPassengers: number;
  orientation: VehicleOrientation;
  length: number;
  cells: GridCell[];
  exitLane: ExitLane;
  location: VehicleLocation;
  dockSlotIndex: number | null;
};

export type Passenger = {
  id: string;
  color: VehicleColor;
  position: number;
};

export type PassengerQueue = {
  passengers: Passenger[];
  nextIndex: number;
};

export type DockState = {
  capacity: number;
  slots: Array<Vehicle | null>;
};

export type BoardSize = {
  rows: number;
  cols: number;
};

export type LevelMetadata = {
  teachingFocus?: string;
};

export type LevelLayout = {
  id: string;
  title: string;
  metadata?: LevelMetadata;
  boardSize: BoardSize;
  vehicles: Vehicle[];
  initialPassengerQueue: Passenger[];
  dockCapacity: number;
};

export type MoveFeedback = {
  code: MoveFeedbackCode;
  tone: MoveFeedbackTone;
  title: string;
  message: string;
};

export type LevelAttempt = {
  layoutId: string;
  boardSize: BoardSize;
  vehicles: Vehicle[];
  passengerQueue: PassengerQueue;
  dock: DockState;
  status: AttemptStatus;
  lossReason: LossReason;
  selectedFeedback: MoveFeedback | null;
};
