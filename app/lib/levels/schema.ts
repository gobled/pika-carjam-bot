import { createGameState, validateMove } from "../game";
import type { LevelDefinition, LevelValidationResult } from "./types";
import { toGameVehicleState } from "./types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pushIntegerError(errors: string[], label: string, value: unknown, minimum = 0) {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    errors.push(`${label} must be an integer greater than or equal to ${minimum}.`);
  }
}

export function validateLevelDefinition(level: LevelDefinition): LevelValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(level.levelId)) {
    errors.push("levelId must be a non-empty string.");
  }

  pushIntegerError(errors, "boardWidth", level.boardWidth, 1);
  pushIntegerError(errors, "boardHeight", level.boardHeight, 1);

  if (!isNonEmptyString(level.themeId)) {
    errors.push("themeId must be a non-empty string.");
  }

  if (!level.vehicles.length) {
    errors.push("vehicles must contain at least one vehicle.");
  }

  const vehicleIds = new Set<string>();
  let totalOpenSeats = 0;

  for (const vehicle of level.vehicles) {
    if (!isNonEmptyString(vehicle.id)) {
      errors.push("Each vehicle must have a non-empty id.");
      continue;
    }

    if (vehicleIds.has(vehicle.id)) {
      errors.push(`Vehicle id ${vehicle.id} is duplicated.`);
    }
    vehicleIds.add(vehicle.id);

    pushIntegerError(errors, `Vehicle ${vehicle.id} x`, vehicle.x, 0);
    pushIntegerError(errors, `Vehicle ${vehicle.id} y`, vehicle.y, 0);
    pushIntegerError(errors, `Vehicle ${vehicle.id} length`, vehicle.length, 2);
    pushIntegerError(errors, `Vehicle ${vehicle.id} capacity`, vehicle.capacity, 1);
    pushIntegerError(errors, `Vehicle ${vehicle.id} occupancy`, vehicle.occupancy ?? 0, 0);

    if ((vehicle.occupancy ?? 0) > vehicle.capacity) {
      errors.push(`Vehicle ${vehicle.id} cannot start over capacity.`);
    }

    if (!isNonEmptyString(vehicle.colorKey)) {
      errors.push(`Vehicle ${vehicle.id} must define a colorKey.`);
    }

    totalOpenSeats += vehicle.capacity - (vehicle.occupancy ?? 0);
  }

  if (!Array.isArray(level.passengerQueue) || level.passengerQueue.length < 1) {
    errors.push("passengerQueue must be a non-empty array.");
  }

  for (const colorKey of level.passengerQueue) {
    if (!isNonEmptyString(colorKey)) {
      errors.push("passengerQueue entries must be non-empty strings.");
    }
  }

  if (level.passengerQueue.length > totalOpenSeats) {
    errors.push(`passengerQueue length cannot exceed total open seats (${totalOpenSeats}).`);
  }

  const thresholds = level.starThresholds;
  pushIntegerError(errors, "starThresholds.threeStars", thresholds.threeStars, 1);
  pushIntegerError(errors, "starThresholds.twoStars", thresholds.twoStars, 1);
  pushIntegerError(errors, "starThresholds.oneStar", thresholds.oneStar, 1);

  if (thresholds.threeStars > thresholds.twoStars || thresholds.twoStars > thresholds.oneStar) {
    errors.push("Star thresholds must increase from threeStars to oneStar.");
  }

  if (!isNonEmptyString(level.hintMetadata.summary)) {
    errors.push("hintMetadata.summary must be a non-empty string.");
  }

  if (level.hintMetadata.recommendedFirstMove) {
    const { vehicleId, delta } = level.hintMetadata.recommendedFirstMove;
    if (!vehicleIds.has(vehicleId)) {
      errors.push(`hintMetadata.recommendedFirstMove references unknown vehicle ${vehicleId}.`);
    }

    if (!Number.isInteger(delta) || delta === 0) {
      errors.push("hintMetadata.recommendedFirstMove.delta must be a non-zero integer.");
    }
  }

  if (!errors.length) {
    try {
      const state = createGameState({
        board: { width: level.boardWidth, height: level.boardHeight },
        vehicles: level.vehicles.map(toGameVehicleState),
        passengerQueue: level.passengerQueue,
      });

    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown level validation error.");
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, level };
}

export function assertValidLevel(level: LevelDefinition): LevelDefinition {
  const result = validateLevelDefinition(level);
  if (!result.ok) {
    throw new Error(`Invalid level ${level.levelId}: ${result.errors.join(" ")}`);
  }

  return result.level;
}
