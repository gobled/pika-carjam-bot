import { isVehiclePathClear } from "@/app/lib/game/pathfinding";
import type {
  DockState,
  DockTapOutcome,
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

export function isVehicleMatchingNextPassenger(attempt: LevelAttempt, vehicle: Vehicle) {
  const nextPassenger = getNextPassenger(attempt);

  return nextPassenger !== null && nextPassenger.color === vehicle.color;
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

  if (isVehicleMatchingNextPassenger(attempt, vehicle)) {
    return "resolved";
  }

  return getFirstOpenDockSlot(attempt.dock) >= 0 ? "docked" : "dock-full-loss";
}

export function getDockTapOutcome(attempt: LevelAttempt, vehicle: Vehicle): DockTapOutcome {
  if (!isAttemptInteractive(attempt) || vehicle.location !== "dock") {
    return "invalid";
  }

  return isVehicleMatchingNextPassenger(attempt, vehicle) ? "resolved" : "invalid";
}

export function hasAdvancingMove(attempt: LevelAttempt) {
  if (!isAttemptInteractive(attempt) || getNextPassenger(attempt) === null) {
    return false;
  }

  return attempt.vehicles.some((vehicle) => {
    if (vehicle.location === "dock") {
      return getDockTapOutcome(attempt, vehicle) === "resolved";
    }

    if (vehicle.location === "parking") {
      const outcome = getParkingTapOutcome(attempt, vehicle);
      return outcome === "resolved" || outcome === "docked";
    }

    return false;
  });
}

export function getNoLegalMoveLossReason(attempt: LevelAttempt): LossReason {
  if (!isAttemptInteractive(attempt) || getNextPassenger(attempt) === null) {
    return null;
  }

  const nextPassenger = getNextPassenger(attempt)!;

  if (isDockFull(attempt.dock)) {
    const hasMatchingVehicle = attempt.vehicles.some(
      (v) =>
        (v.location === "parking" || v.location === "dock") &&
        v.color === nextPassenger.color,
    );
    if (!hasMatchingVehicle) return "no-legal-move";
  }

  return hasAdvancingMove(attempt) ? null : "no-legal-move";
}
