"use client";

import { isVehiclePathClear } from "@/app/lib/game/pathfinding";
import type { BoardSize, Vehicle } from "@/app/lib/game/types";
import { VehicleCard } from "./VehicleCard";

type GameBoardProps = {
  boardSize: BoardSize;
  vehicles: Vehicle[];
  disabled?: boolean;
  nextPassengerColor: Vehicle["color"] | null;
  onVehicleTap?: (vehicleId: string) => void;
};

export function GameBoard({
  boardSize,
  vehicles,
  disabled = false,
  nextPassengerColor,
  onVehicleTap,
}: GameBoardProps) {
  const parkingVehicles = vehicles.filter((vehicle) => vehicle.location === "parking");

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[20px] border border-white/10 bg-slate-950/70 p-1.5 shadow-2xl shadow-black/20">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="grid aspect-square w-full gap-1 rounded-[18px] bg-slate-900/90 p-1 sm:gap-1.5 sm:p-1.5"
          style={{
            gridTemplateColumns: `repeat(${boardSize.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${boardSize.rows}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: boardSize.rows * boardSize.cols }, (_, index) => (
            <div
              key={`cell-${index}`}
              className="rounded-xl border border-white/5 bg-white/[0.03]"
            />
          ))}

          {parkingVehicles.map((vehicle) => {
            const isClear = isVehiclePathClear(vehicle, vehicles, boardSize);
            const isMatch = nextPassengerColor === vehicle.color;

            return (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isClear={isClear}
                isMatch={isMatch}
                disabled={disabled}
                onTap={onVehicleTap}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
