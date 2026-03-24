import { isVehiclePathClear } from "@/app/lib/game/pathfinding";
import type {
  DockState,
  LevelAttempt,
  LossReason,
  ParkingTapOutcome,
  Passenger,
  Vehicle,
} from "@/app/lib/game/types";

export function getNextPassenger(attempt: LevelAttempt): Passenger | null {
  return attempt.passengerQueue.passengers[attempt.passengerQueue.nextIndex] ?? null;
}

export function getVehicleById(attempt: LevelAttempt, vehicleId: string) {
  return attempt.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
}

export function isDockFull(dock: DockState) {
  return dock.slots.every((slot) => slot !== null);
}

export function getFirstOpenDockSlot(dock: DockState) {
  return dock.slots.findIndex((slot) => slot === null);
}

export function isAttemptInteractive(attempt: LevelAttempt) {
  return !isAttemptComplete(attempt);
}

export function isAttemptComplete(attempt: LevelAttempt) {
  return attempt.status !== "playing";
}

export function canVehicleExit(attempt: LevelAttempt, vehicle: Vehicle) {
  if (vehicle.location !== "parking") {
    return false;
  }

  return isVehiclePathClear(vehicle, attempt.vehicles, attempt.boardSize);
}

export function getParkingTapOutcome(
  attempt: LevelAttempt,
  vehicle: Vehicle,
): ParkingTapOutcome {
  if (!isAttemptInteractive(attempt) || vehicle.location !== "parking") {
    return "invalid";
  }

  if (!canVehicleExit(attempt, vehicle)) {
    return "blocked";
  }

  return isDockFull(attempt.dock) ? "spot-full-loss" : "can-exit";
}

export function getNoLegalMoveLossReason(attempt: LevelAttempt): LossReason {
  if (!isAttemptInteractive(attempt)) return null;

  const queue = attempt.passengerQueue;
  if (queue.passengers.length === 0) return null;

  const frontPassenger = queue.passengers[queue.nextIndex];
  if (!frontPassenger) return null;

  // Auto-boarding can still run if a spot vehicle matches the front of queue
  const spotCanBoard = attempt.dock.slots.some(
    (s) => s !== null && s.color === frontPassenger.color && s.boardedPassengers < s.seats,
  );
  if (spotCanBoard) return null;

  // Player can make progress if the spot has room AND a parked vehicle can exit
  const spotHasRoom = !isDockFull(attempt.dock);
  const anyParkingCanExit = attempt.vehicles.some(
    (v) => v.location === "parking" && canVehicleExit(attempt, v),
  );

  if (spotHasRoom && anyParkingCanExit) return null;

  return "no-legal-move";
}
