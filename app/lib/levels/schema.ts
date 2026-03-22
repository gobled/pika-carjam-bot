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

  if (!isNonEmptyString(level.targetVehicleId)) {
    errors.push("targetVehicleId must be a non-empty string.");
  }

  if (!isNonEmptyString(level.themeId)) {
    errors.push("themeId must be a non-empty string.");
  }

  if (!level.vehicles.length) {
    errors.push("vehicles must contain at least one vehicle.");
  }

  const vehicleIds = new Set<string>();
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

    const validFacing = vehicle.orientation === "horizontal"
      ? vehicle.facing === "left" || vehicle.facing === "right"
      : vehicle.facing === "up" || vehicle.facing === "down";

    if (!validFacing) {
      errors.push(`Vehicle ${vehicle.id} must face along its movement axis.`);
    }

    if (!vehicle.colorKey && !vehicle.skinKey) {
      errors.push(`Vehicle ${vehicle.id} must define either colorKey or skinKey.`);
    }
  }

  const thresholds = level.starThresholds;
  pushIntegerError(errors, "starThresholds.threeStars", thresholds.threeStars, 1);
  pushIntegerError(errors, "starThresholds.twoStars", thresholds.twoStars, 1);
  pushIntegerError(errors, "starThresholds.oneStar", thresholds.oneStar, 1);

  if (
    thresholds.threeStars > thresholds.twoStars ||
    thresholds.twoStars > thresholds.oneStar
  ) {
    errors.push("Star thresholds must increase from threeStars to oneStar.");
  }

  if (!isNonEmptyString(level.hintMetadata.summary)) {
    errors.push("hintMetadata.summary must be a non-empty string.");
  }

  if (!Array.isArray(level.hintMetadata.focusVehicleIds) || !level.hintMetadata.focusVehicleIds.length) {
    errors.push("hintMetadata.focusVehicleIds must contain at least one vehicle id.");
  }

  for (const vehicleId of level.hintMetadata.focusVehicleIds) {
    if (!vehicleIds.has(vehicleId)) {
      errors.push(`hintMetadata.focusVehicleIds references unknown vehicle ${vehicleId}.`);
    }
  }

  if (level.hintMetadata.recommendedFirstMove) {
    const { vehicleId, distance } = level.hintMetadata.recommendedFirstMove;
    if (!vehicleIds.has(vehicleId)) {
      errors.push(`hintMetadata.recommendedFirstMove references unknown vehicle ${vehicleId}.`);
    }

    if (!Number.isInteger(distance) || distance <= 0) {
      errors.push("hintMetadata.recommendedFirstMove.distance must be a positive integer because cars only move forward.");
    }
  }

  const targetVehicle = level.vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
  if (!targetVehicle) {
    errors.push(`targetVehicleId ${level.targetVehicleId} does not exist in vehicles.`);
  } else if (targetVehicle.role !== "target") {
    errors.push(`Target vehicle ${level.targetVehicleId} must use the target role.`);
  }

  const targetCount = level.vehicles.filter((vehicle) => vehicle.role === "target").length;
  if (targetCount !== 1) {
    errors.push(`Each level must include exactly one target vehicle; found ${targetCount}.`);
  }

  if (!errors.length) {
    try {
      const state = createGameState({
        board: { width: level.boardWidth, height: level.boardHeight },
        exit: level.exit,
        targetVehicleId: level.targetVehicleId,
        vehicles: level.vehicles.map(toGameVehicleState),
      });

      const recommendedMove = level.hintMetadata.recommendedFirstMove;
      if (recommendedMove) {
        const moveValidation = validateMove(state, recommendedMove);
        if (!moveValidation.ok) {
          errors.push(`hintMetadata.recommendedFirstMove is invalid: ${moveValidation.message}`);
        }
      }
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
