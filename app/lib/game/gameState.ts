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
  getDockTapOutcome,
  getFirstOpenDockSlot,
  getNoLegalMoveLossReason,
  getParkingTapOutcome,
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
  if (lossReason === "dock-full") {
    return {
      code: "dock-full-loss",
      tone: "danger",
      title: "Dock is full",
      message: "All three dock slots are occupied, so that clear vehicle had nowhere to wait.",
    };
  }

  return {
    code: "no-legal-move-loss",
    tone: "warning",
    title: "No legal move left",
    message: "No clear parking move or matching dock tap can advance the queue.",
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

function finalizeAttempt(attempt: LevelAttempt, feedback: MoveFeedback | null): LevelAttempt {
  const nextAttempt: LevelAttempt = {
    ...attempt,
    dock: buildDockState(attempt.dock.capacity, attempt.vehicles),
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

  const playingAttempt: LevelAttempt = {
    ...nextAttempt,
    status: "playing",
    lossReason: null,
  };

  return autoResolveDockMatch(playingAttempt);
}

function autoResolveDockMatch(attempt: LevelAttempt): LevelAttempt {
  if (attempt.status !== "playing") return attempt;

  const nextPassenger = attempt.passengerQueue.passengers[attempt.passengerQueue.nextIndex];
  if (!nextPassenger) return attempt;

  const matchingVehicle = attempt.dock.slots.find(
    (slot) => slot !== null && slot.color === nextPassenger.color,
  ) ?? null;

  if (!matchingVehicle) return attempt;

  return resolveVehicle(attempt, matchingVehicle.id, {
    code: "dock-resolved",
    tone: "success",
    title: "Auto-matched from dock",
    message: `${formatVehicleColor(matchingVehicle.color)} automatically boarded from the dock.`,
  });
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
      message: "Tap a clear vehicle to board the next passenger or stage it in the dock.",
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
      message: "The opening layout, queue, and empty dock are back in place.",
    } satisfies MoveFeedback,
  };
}

export function setAttemptFeedback(attempt: LevelAttempt, feedback: MoveFeedback | null): LevelAttempt {
  return {
    ...attempt,
    selectedFeedback: feedback,
  };
}

function resolveVehicle(
  attempt: LevelAttempt,
  vehicleId: string,
  feedback: MoveFeedback,
): LevelAttempt {
  return finalizeAttempt(
    {
      ...attempt,
      vehicles: attempt.vehicles.map((vehicle) =>
        vehicle.id === vehicleId
          ? {
              ...cloneVehicle(vehicle),
              location: "resolved",
              dockSlotIndex: null,
            }
          : cloneVehicle(vehicle),
      ),
      passengerQueue: advancePassengerQueue(attempt.passengerQueue),
    },
    feedback,
  );
}

function moveVehicleToDock(
  attempt: LevelAttempt,
  vehicleId: string,
  dockSlotIndex: number,
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
              dockSlotIndex,
            }
          : cloneVehicle(candidate),
      ),
    },
    {
      code: "vehicle-docked",
      tone: "info",
      title: "Vehicle parked in dock",
      message: `${formatVehicleColor(color)} moved into dock slot ${dockSlotIndex + 1} and will need a later matching tap to board.`,
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

  switch (getParkingTapOutcome(attempt, vehicle)) {
    case "blocked":
      return setAttemptFeedback(attempt, {
        code: "blocked-vehicle",
        tone: "warning",
        title: "Exit is blocked",
        message: `${formatVehicleColor(vehicle.color)} cannot leave until its lane is clear.`,
      });
    case "resolved":
      return resolveVehicle(attempt, vehicle.id, {
        code: "parking-resolved",
        tone: "success",
        title: "Passenger boarded",
        message: `${formatVehicleColor(vehicle.color)} left the lot and advanced the queue.`,
      });
    case "docked": {
      const dockSlotIndex = getFirstOpenDockSlot(attempt.dock);

      if (dockSlotIndex < 0) {
        return {
          ...attempt,
          status: "lost",
          lossReason: "dock-full",
          selectedFeedback: createLossFeedback("dock-full"),
        };
      }

      return moveVehicleToDock(attempt, vehicle.id, dockSlotIndex, vehicle.color);
    }
    case "dock-full-loss":
      return {
        ...attempt,
        status: "lost",
        lossReason: "dock-full",
        selectedFeedback: createLossFeedback("dock-full"),
      };
    case "invalid":
    default:
      return setAttemptFeedback(attempt, {
        code: "vehicle-missing",
        tone: "neutral",
        title: "Move unavailable",
        message: "Only clear parking vehicles can leave the lot.",
      });
  }
}

export function resolveDockVehicleTap(attempt: LevelAttempt, vehicleId: string): LevelAttempt {
  if (!isAttemptInteractive(attempt)) {
    return setAttemptFeedback(attempt, createLockedFeedback(attempt));
  }

  const vehicle = getVehicleById(attempt, vehicleId);

  if (!vehicle) {
    return setAttemptFeedback(attempt, {
      code: "vehicle-missing",
      tone: "warning",
      title: "Vehicle unavailable",
      message: "That dock slot is no longer occupied by an active vehicle.",
    });
  }

  if (getDockTapOutcome(attempt, vehicle) === "resolved") {
    return resolveVehicle(attempt, vehicle.id, {
      code: "dock-resolved",
      tone: "success",
      title: "Docked vehicle resolved",
      message: `${formatVehicleColor(vehicle.color)} matched the queue and boarded from the dock.`,
    });
  }

  return setAttemptFeedback(attempt, {
    code: "invalid-dock-tap",
    tone: "warning",
    title: "Dock vehicle does not match",
    message: "Only the docked vehicle that matches the next passenger can be tapped to resolve right now.",
  });
}

export function clearAttemptFeedback(attempt: LevelAttempt): LevelAttempt {
  return setAttemptFeedback(attempt, null);
}
