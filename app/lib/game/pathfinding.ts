import type { BoardSize, GridCell, Vehicle } from "@/app/lib/game/types";

export function toCellKey({ row, col }: GridCell) {
  return `${row}:${col}`;
}

export function buildOccupancyMap(vehicles: Vehicle[]) {
  return new Set(
    vehicles
      .filter((vehicle) => vehicle.location === "parking")
      .flatMap((vehicle) => vehicle.cells.map(toCellKey)),
  );
}

export function getVehicleBounds(vehicle: Vehicle) {
  const rows = vehicle.cells.map((cell) => cell.row);
  const cols = vehicle.cells.map((cell) => cell.col);

  return {
    minRow: Math.min(...rows),
    maxRow: Math.max(...rows),
    minCol: Math.min(...cols),
    maxCol: Math.max(...cols),
  };
}

export function getExitPathCells(vehicle: Vehicle, boardSize: BoardSize): GridCell[] {
  const bounds = getVehicleBounds(vehicle);
  const path: GridCell[] = [];

  switch (vehicle.exitLane) {
    case "up":
      for (let row = bounds.minRow - 1; row >= 0; row -= 1) {
        path.push({ row, col: bounds.minCol });
      }
      break;
    case "right":
      for (let col = bounds.maxCol + 1; col < boardSize.cols; col += 1) {
        path.push({ row: bounds.minRow, col });
      }
      break;
    case "down":
      for (let row = bounds.maxRow + 1; row < boardSize.rows; row += 1) {
        path.push({ row, col: bounds.minCol });
      }
      break;
    case "left":
      for (let col = bounds.minCol - 1; col >= 0; col -= 1) {
        path.push({ row: bounds.minRow, col });
      }
      break;
  }

  return path;
}

export function isVehiclePathClear(
  vehicle: Vehicle,
  vehicles: Vehicle[],
  boardSize: BoardSize,
) {
  const occupancy = buildOccupancyMap(
    vehicles.filter((candidate) => candidate.id !== vehicle.id),
  );

  return getExitPathCells(vehicle, boardSize).every(
    (cell) => !occupancy.has(toCellKey(cell)),
  );
}
