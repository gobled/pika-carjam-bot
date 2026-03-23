export type VehicleColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange";

export type VehicleOrientation = "horizontal" | "vertical";
export type ExitLane = "up" | "right" | "down" | "left";
export type VehicleLocation = "parking" | "dock" | "resolved";
export type AttemptStatus = "playing" | "won" | "lost";
export type LossReason = "dock-full" | "no-legal-move" | null;
export type MoveFeedbackTone = "neutral" | "info" | "success" | "warning" | "danger";
export type MoveFeedbackCode =
  | "attempt-ready"
  | "attempt-reset"
  | "attempt-locked"
  | "blocked-vehicle"
  | "parking-resolved"
  | "vehicle-docked"
  | "dock-resolved"
  | "invalid-dock-tap"
  | "vehicle-missing"
  | "dock-full-loss"
  | "no-legal-move-loss"
  | "win";
export type ParkingTapOutcome = "invalid" | "blocked" | "resolved" | "docked" | "dock-full-loss";
export type DockTapOutcome = "invalid" | "resolved";

export type GridCell = {
  row: number;
  col: number;
};

export type Vehicle = {
  id: string;
  color: VehicleColor;
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
