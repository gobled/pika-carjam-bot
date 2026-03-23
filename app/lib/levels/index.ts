import { createGameState } from "../game";
import type { GameState } from "../game";
import { LAUNCH_LEVEL_PACK } from "./content";
import { assertValidLevel, validateLevelDefinition } from "./schema";
import { solveLevel } from "./solver";
import type { LevelDefinition, LevelSummary, NextLevelMetadata } from "./types";
import { toGameVehicleState } from "./types";

export * from "./content";
export * from "./schema";
export * from "./solver";
export * from "./types";

const VALIDATED_LEVELS = LAUNCH_LEVEL_PACK.levels.map(assertValidLevel);

export function getAllLevels(): LevelDefinition[] {
  return VALIDATED_LEVELS.map((level) => ({
    ...level,
    exit: { ...level.exit },
    vehicles: level.vehicles.map((vehicle) => ({ ...vehicle })),
    starThresholds: { ...level.starThresholds },
    hintMetadata: {
      ...level.hintMetadata,
      focusVehicleIds: [...level.hintMetadata.focusVehicleIds],
      recommendedFirstMove: level.hintMetadata.recommendedFirstMove
        ? { ...level.hintMetadata.recommendedFirstMove }
        : undefined,
    },
  }));
}

export function getLevelById(levelId: string): LevelDefinition | null {
  return getAllLevels().find((level) => level.levelId === levelId) ?? null;
}

export function getLevelSummaries(): LevelSummary[] {
  return VALIDATED_LEVELS.map((level) => ({
    levelId: level.levelId,
    boardWidth: level.boardWidth,
    boardHeight: level.boardHeight,
    themeId: level.themeId,
    starThresholds: { ...level.starThresholds },
    vehicleCount: level.vehicles.length,
  }));
}

export function getNextLevelMetadata(levelId: string): NextLevelMetadata | null {
  const currentIndex = VALIDATED_LEVELS.findIndex((level) => level.levelId === levelId);
  if (currentIndex === -1) {
    return null;
  }

  const nextLevel = VALIDATED_LEVELS[currentIndex + 1] ?? null;

  return {
    currentLevelId: levelId,
    currentIndex,
    totalLevels: VALIDATED_LEVELS.length,
    nextLevelId: nextLevel?.levelId ?? null,
    hasNextLevel: nextLevel !== null,
  };
}

export function createGameStateFromLevel(levelId: string): GameState {
  const level = getLevelById(levelId);
  if (!level) {
    throw new Error(`Unknown level ${levelId}.`);
  }

  return createGameState({
    board: { width: level.boardWidth, height: level.boardHeight },
    exit: level.exit,
    targetVehicleId: level.targetVehicleId,
    vehicles: level.vehicles.map(toGameVehicleState),
  });
}

export function getStarRating(level: LevelDefinition, moveCount: number) {
  if (moveCount <= level.starThresholds.threeStars) {
    return 3;
  }

  if (moveCount <= level.starThresholds.twoStars) {
    return 2;
  }

  if (moveCount <= level.starThresholds.oneStar) {
    return 1;
  }

  return 0;
}

export function validateLaunchLevels() {
  return VALIDATED_LEVELS.map((level) => {
    const validation = validateLevelDefinition(level);
    const solution = solveLevel(level);

    return {
      levelId: level.levelId,
      validation,
      solution,
    };
  });
}
