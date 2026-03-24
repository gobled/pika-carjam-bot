import { PLAYABLE_LEVEL_LAYOUT } from "@/app/lib/game/levelLayout";
import type {
  DockState,
  LevelAttempt,
  LevelLayout,
  LossReason,
  MoveFeedback,
  PassengerQueue,
  Vehicle,
} from "@/app/lib/game/types";
import {
  canVehicleExit,
  getFirstOpenDockSlot,
  getNoLegalMoveLossReason,
  getVehicleById,
  isAttemptInteractive,
} from "@/app/lib/game/validation";

function cloneVehicle(vehicle: Vehicle): Vehicle {
  return {
    ...vehicle,
    cells: vehicle.cells.map((cell) => ({ ...cell })),
  };
}

function cloneVehicles(vehicles: Vehicle[]) {
  return vehicles.map(cloneVehicle);
}

function createPassengerQueue(layout: LevelLayout): PassengerQueue {
  return {
    passengers: layout.initialPassengerQueue.map((passenger) => ({ ...passenger })),
    nextIndex: 0,
  };
}

function advancePassengerQueue(queue: PassengerQueue): PassengerQueue {
  const passengers = queue.passengers
    .slice(queue.nextIndex + 1)
    .map((passenger, position) => ({
      ...passenger,
      position,
    }));

  return {
    passengers,
    nextIndex: 0,
  };
}

function buildDockState(capacity: number, vehicles: Vehicle[]): DockState {
  const slots = Array.from({ length: capacity }, () => null) as Array<Vehicle | null>;

  vehicles
    .filter((vehicle) => vehicle.location === "dock" && vehicle.dockSlotIndex !== null)
    .sort((left, right) => (left.dockSlotIndex ?? 0) - (right.dockSlotIndex ?? 0))
    .forEach((vehicle) => {
      if (vehicle.dockSlotIndex !== null && vehicle.dockSlotIndex < capacity) {
        slots[vehicle.dockSlotIndex] = cloneVehicle(vehicle);
      }
    });

  return {
    capacity,
    slots,
  };
}

function formatVehicleColor(color: Vehicle["color"]) {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function createLockedFeedback(attempt: LevelAttempt): MoveFeedback {
  if (attempt.status === "won") {
    return {
      code: "attempt-locked",
      tone: "success",
      title: "Attempt complete",
      message: "This run is already won. Restart the level to play again.",
    };
  }

  return {
    code: "attempt-locked",
    tone: "warning",
    title: "Attempt complete",
    message: "This run has ended. Restart the level to try again.",
  };
}

function createLossFeedback(lossReason: Exclude<LossReason, null>): MoveFeedback {
  return {
    code: "no-legal-move-loss",
    tone: "warning",
    title: "No moves left",
    message:
      lossReason === "no-legal-move"
        ? "The boarding spot is full and no parked vehicle can exit."
        : "No progress can be made.",
  };
}

function createWinFeedback(): MoveFeedback {
  return {
    code: "win",
    tone: "success",
    title: "Level complete",
    message: "Every passenger boarded. Restart the same layout or exit back to the home screen.",
  };
}

/**
 * Automatically boards passengers from the front of the queue onto matching
 * vehicles at the boarding spot. Runs until no more matches are possible.
 * When a vehicle's seats are all filled it is marked as resolved and leaves.
 */
function autoBoardPassengers(attempt: LevelAttempt): LevelAttempt {
  let current = attempt;

  while (true) {
    const queue = current.passengerQueue;
    if (queue.passengers.length === 0) break;

    const frontPassenger = queue.passengers[queue.nextIndex];
    if (!frontPassenger) break;

    const matchingSlotIndex = current.dock.slots.findIndex(
      (s) => s !== null && s.color === frontPassenger.color && s.boardedPassengers < s.seats,
    );
    if (matchingSlotIndex < 0) break;

    const matchingVehicle = current.dock.slots[matchingSlotIndex]!;
    const newBoardedCount = matchingVehicle.boardedPassengers + 1;
    const isFull = newBoardedCount >= matchingVehicle.seats;

    const newVehicles = current.vehicles.map((v) =>
      v.id === matchingVehicle.id
        ? {
            ...cloneVehicle(v),
            boardedPassengers: newBoardedCount,
            location: isFull ? ("resolved" as const) : v.location,
            dockSlotIndex: isFull ? null : v.dockSlotIndex,
          }
        : cloneVehicle(v),
    );

    current = {
      ...current,
      vehicles: newVehicles,
      passengerQueue: advancePassengerQueue(current.passengerQueue),
      dock: buildDockState(current.dock.capacity, newVehicles),
    };
  }

  return current;
}

function finalizeAttempt(attempt: LevelAttempt, feedback: MoveFeedback | null): LevelAttempt {
  const withDock: LevelAttempt = {
    ...attempt,
    dock: buildDockState(attempt.dock.capacity, attempt.vehicles),
    selectedFeedback: feedback,
  };

  const afterBoarding = autoBoardPassengers(withDock);

  const nextAttempt: LevelAttempt = {
    ...afterBoarding,
    dock: buildDockState(afterBoarding.dock.capacity, afterBoarding.vehicles),
    selectedFeedback: feedback,
  };

  if (nextAttempt.passengerQueue.passengers.length === 0) {
    return {
      ...nextAttempt,
      status: "won",
      lossReason: null,
      selectedFeedback: createWinFeedback(),
    };
  }

  const lossReason = getNoLegalMoveLossReason({
    ...nextAttempt,
    status: "playing",
    lossReason: null,
  });

  if (lossReason) {
    return {
      ...nextAttempt,
      status: "lost",
      lossReason,
      selectedFeedback: createLossFeedback(lossReason),
    };
  }

  return {
    ...nextAttempt,
    status: "playing",
    lossReason: null,
  };
}

export function createInitialAttempt(layout: LevelLayout = PLAYABLE_LEVEL_LAYOUT): LevelAttempt {
  const vehicles = cloneVehicles(layout.vehicles);

  return finalizeAttempt(
    {
      layoutId: layout.id,
      boardSize: { ...layout.boardSize },
      vehicles,
      passengerQueue: createPassengerQueue(layout),
      dock: {
        capacity: layout.dockCapacity,
        slots: Array.from({ length: layout.dockCapacity }, () => null),
      },
      status: "playing",
      lossReason: null,
      selectedFeedback: null,
    },
    {
      code: "attempt-ready",
      tone: "info",
      title: "Board ready",
      message: "Tap a clear vehicle to send it to the boarding spot.",
    },
  );
}

export function restartAttempt(layout: LevelLayout = PLAYABLE_LEVEL_LAYOUT): LevelAttempt {
  const resetAttempt = createInitialAttempt(layout);

  return {
    ...resetAttempt,
    selectedFeedback: {
      code: "attempt-reset",
      tone: "info",
      title: "Attempt reset",
      message: "The opening layout, queue, and empty boarding spot are back in place.",
    } satisfies MoveFeedback,
  };
}

export function setAttemptFeedback(attempt: LevelAttempt, feedback: MoveFeedback | null): LevelAttempt {
  return {
    ...attempt,
    selectedFeedback: feedback,
  };
}

function moveVehicleToSpot(
  attempt: LevelAttempt,
  vehicleId: string,
  spotSlotIndex: number,
  color: Vehicle["color"],
): LevelAttempt {
  return finalizeAttempt(
    {
      ...attempt,
      vehicles: attempt.vehicles.map((candidate) =>
        candidate.id === vehicleId
          ? {
              ...cloneVehicle(candidate),
              location: "dock",
              dockSlotIndex: spotSlotIndex,
            }
          : cloneVehicle(candidate),
      ),
    },
    {
      code: "vehicle-sent-to-spot",
      tone: "info",
      title: "Vehicle at boarding spot",
      message: `${formatVehicleColor(color)} is now loading passengers at the boarding spot.`,
    },
  );
}

export function resolveParkingVehicleTap(attempt: LevelAttempt, vehicleId: string): LevelAttempt {
  if (!isAttemptInteractive(attempt)) {
    return setAttemptFeedback(attempt, createLockedFeedback(attempt));
  }

  const vehicle = getVehicleById(attempt, vehicleId);

  if (!vehicle) {
    return setAttemptFeedback(attempt, {
      code: "vehicle-missing",
      tone: "warning",
      title: "Vehicle unavailable",
      message: "That vehicle is no longer part of the active attempt.",
    });
  }

  if (!canVehicleExit(attempt, vehicle)) {
    return setAttemptFeedback(attempt, {
      code: "blocked-vehicle",
      tone: "warning",
      title: "Exit is blocked",
      message: `${formatVehicleColor(vehicle.color)} cannot leave until its lane is clear.`,
    });
  }

  const spotSlotIndex = getFirstOpenDockSlot(attempt.dock);

  if (spotSlotIndex < 0) {
    return {
      ...attempt,
      status: "lost",
      lossReason: "no-legal-move",
      selectedFeedback: createLossFeedback("no-legal-move"),
    };
  }

  return moveVehicleToSpot(attempt, vehicle.id, spotSlotIndex, vehicle.color);
}

export function clearAttemptFeedback(attempt: LevelAttempt): LevelAttempt {
  return setAttemptFeedback(attempt, null);
}

