import type { ExitPosition, VehicleFacing, VehicleRole, VehicleState, VehicleOrientation } from "../game";

export type LevelVehicleDefinition = {
  id: string;
  x: number;
  y: number;
  length: number;
  orientation: VehicleOrientation;
  role: VehicleRole;
  facing: VehicleFacing;
  colorKey?: string;
  skinKey?: string;
};

export type LevelStarThresholds = {
  threeStars: number;
  twoStars: number;
  oneStar: number;
};

export type LevelHintMetadata = {
  summary: string;
  focusVehicleIds: string[];
  recommendedFirstMove?: {
    vehicleId: string;
    distance: number;
  };
};

export type LevelDefinition = {
  levelId: string;
  boardWidth: number;
  boardHeight: number;
  exit: ExitPosition;
  targetVehicleId: string;
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
    distance: number;
  }>;
};

export function toGameVehicleState(vehicle: LevelVehicleDefinition): VehicleState {
  return {
    id: vehicle.id,
    x: vehicle.x,
    y: vehicle.y,
    length: vehicle.length,
    orientation: vehicle.orientation,
    role: vehicle.role,
    facing: vehicle.facing,
  };
}
