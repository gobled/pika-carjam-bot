import type { HintSuggestion, VehicleOrientation, VehicleState } from "../game";

export type LevelVehicleDefinition = Omit<VehicleState, "occupancy"> & {
  occupancy?: number;
};

export type LevelStarThresholds = {
  threeStars: number;
  twoStars: number;
  oneStar: number;
};

export type LevelHintMetadata = {
  summary: string;
  recommendedFirstMove?: {
    vehicleId: string;
    delta: number;
  };
};

export type LevelDefinition = {
  levelId: string;
  boardWidth: number;
  boardHeight: number;
  passengerQueue: string[];
  vehicles: LevelVehicleDefinition[];
  starThresholds: LevelStarThresholds;
  themeId: string;
  hintMetadata: LevelHintMetadata;
};

export type LaunchLevelPack = {
  packId: string;
  title: string;
  totalPlannedLevels: number;
  levels: LevelDefinition[];
};

export type LevelSummary = Pick<LevelDefinition, "levelId" | "themeId" | "starThresholds"> & {
  boardWidth: number;
  boardHeight: number;
  vehicleCount: number;
  passengerCount: number;
};

export type NextLevelMetadata = {
  currentLevelId: string;
  currentIndex: number;
  totalLevels: number;
  nextLevelId: string | null;
  hasNextLevel: boolean;
};

export type LevelValidationSuccess = {
  ok: true;
  level: LevelDefinition;
};

export type LevelValidationFailure = {
  ok: false;
  errors: string[];
};

export type LevelValidationResult = LevelValidationSuccess | LevelValidationFailure;

export type SolvedLevelResult = {
  levelId: string;
  minimumMoves: number;
  moves: Array<{
    vehicleId: string;
    delta: number;
  }>;
};

export function toGameVehicleState(vehicle: LevelVehicleDefinition): VehicleState {
  return {
    ...vehicle,
    occupancy: vehicle.occupancy ?? 0,
  };
}

export type LevelPresetTheme = "sunrise-lot" | "aquarium-lot" | "arcade-lot" | "festival-lot";
