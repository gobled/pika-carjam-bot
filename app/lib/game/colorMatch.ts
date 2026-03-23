export type DockedVehicle = {
  vehicleId: string;
  colorKey: string;
};

export type ColorMatchState = {
  passengerQueue: string[];
  initialPassengerQueue: string[];
  dockSlots: number;
  dockedVehicles: DockedVehicle[];
  dispatchedVehicleIds: string[];
  isComplete: boolean;
  isFailed: boolean;
};

export type ColorMatchResolution = {
  state: ColorMatchState;
  outcome: "matched" | "docked" | "failed";
  primaryVehicle: DockedVehicle;
  autoDispatchedFromDock: DockedVehicle[];
};

function cloneDockedVehicles(vehicles: DockedVehicle[]) {
  return vehicles.map((vehicle) => ({ ...vehicle }));
}

function finalizeState(state: Omit<ColorMatchState, "isComplete" | "isFailed"> & { isFailed?: boolean }): ColorMatchState {
  const isFailed = Boolean(state.isFailed);
  return {
    passengerQueue: [...state.passengerQueue],
    initialPassengerQueue: [...state.initialPassengerQueue],
    dockSlots: state.dockSlots,
    dockedVehicles: cloneDockedVehicles(state.dockedVehicles),
    dispatchedVehicleIds: [...state.dispatchedVehicleIds],
    isFailed,
    isComplete: !isFailed && state.passengerQueue.length === 0 && state.dockedVehicles.length === 0,
  };
}

export function createColorMatchState(input: { passengerQueue: string[]; dockSlots: number }): ColorMatchState {
  return finalizeState({
    passengerQueue: [...input.passengerQueue],
    initialPassengerQueue: [...input.passengerQueue],
    dockSlots: input.dockSlots,
    dockedVehicles: [],
    dispatchedVehicleIds: [],
  });
}

export function resetColorMatchState(state: ColorMatchState): ColorMatchState {
  return createColorMatchState({
    passengerQueue: state.initialPassengerQueue,
    dockSlots: state.dockSlots,
  });
}

export function serializeColorMatchState(state: ColorMatchState) {
  const queue = state.passengerQueue.join(",");
  const dock = state.dockedVehicles.map((vehicle) => `${vehicle.vehicleId}:${vehicle.colorKey}`).join(",");
  return `q:${queue}|d:${dock}|f:${state.isFailed ? 1 : 0}`;
}

export function resolveEscapedVehicle(
  state: ColorMatchState,
  escapedVehicle: DockedVehicle,
): ColorMatchResolution {
  if (state.isComplete || state.isFailed) {
    return {
      state,
      outcome: state.isFailed ? "failed" : "matched",
      primaryVehicle: { ...escapedVehicle },
      autoDispatchedFromDock: [],
    };
  }

  const nextQueue = [...state.passengerQueue];
  const nextDock = cloneDockedVehicles(state.dockedVehicles);
  const nextDispatchedVehicleIds = [...state.dispatchedVehicleIds];
  const autoDispatchedFromDock: DockedVehicle[] = [];

  let outcome: ColorMatchResolution["outcome"];
  if (nextQueue[0] === escapedVehicle.colorKey) {
    nextQueue.shift();
    nextDispatchedVehicleIds.push(escapedVehicle.vehicleId);
    outcome = "matched";
  } else if (nextDock.length < state.dockSlots) {
    nextDock.push({ ...escapedVehicle });
    outcome = "docked";
  } else {
    return {
      state: finalizeState({
        passengerQueue: nextQueue,
        initialPassengerQueue: state.initialPassengerQueue,
        dockSlots: state.dockSlots,
        dockedVehicles: nextDock,
        dispatchedVehicleIds: nextDispatchedVehicleIds,
        isFailed: true,
      }),
      outcome: "failed",
      primaryVehicle: { ...escapedVehicle },
      autoDispatchedFromDock,
    };
  }

  while (nextQueue.length > 0) {
    const dockIndex = nextDock.findIndex((vehicle) => vehicle.colorKey === nextQueue[0]);
    if (dockIndex === -1) {
      break;
    }

    const [releasedVehicle] = nextDock.splice(dockIndex, 1);
    nextQueue.shift();
    nextDispatchedVehicleIds.push(releasedVehicle.vehicleId);
    autoDispatchedFromDock.push(releasedVehicle);
  }

  return {
    state: finalizeState({
      passengerQueue: nextQueue,
      initialPassengerQueue: state.initialPassengerQueue,
      dockSlots: state.dockSlots,
      dockedVehicles: nextDock,
      dispatchedVehicleIds: nextDispatchedVehicleIds,
    }),
    outcome,
    primaryVehicle: { ...escapedVehicle },
    autoDispatchedFromDock,
  };
}
