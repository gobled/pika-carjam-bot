"use client";

import { getVehicleBounds, isVehiclePathClear } from "@/app/lib/game/pathfinding";
import type { BoardSize, Vehicle } from "@/app/lib/game/types";

type GameBoardProps = {
  boardSize: BoardSize;
  vehicles: Vehicle[];
  disabled?: boolean;
  nextPassengerColor: Vehicle["color"] | null;
  onVehicleTap?: (vehicleId: string) => void;
};

const VEHICLE_STYLES: Record<Vehicle["color"], string> = {
  red: "bg-rose-500/90 border-rose-300/80",
  blue: "bg-sky-500/90 border-sky-300/80",
  green: "bg-emerald-500/90 border-emerald-300/80",
  yellow: "bg-amber-400/90 border-amber-200/80 text-slate-900",
  purple: "bg-violet-500/90 border-violet-300/80",
  orange: "bg-orange-500/90 border-orange-300/80",
};

const EXIT_LABELS: Record<Vehicle["exitLane"], string> = {
  up: "Top exit",
  right: "Right exit",
  down: "Bottom exit",
  left: "Left exit",
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
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-3 shadow-2xl shadow-black/20 sm:p-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
        <span>Parking Lot</span>
        <span>
          {boardSize.rows} x {boardSize.cols}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-300">
        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-100">
          Glow = active match
        </span>
        <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-amber-100">
          Muted = blocked
        </span>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-slate-300">
          Tap parked vehicles only
        </span>
      </div>

      <div
        className="grid aspect-square w-full gap-1.5 rounded-2xl bg-slate-900/90 p-1.5 sm:gap-2 sm:p-2"
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
          const bounds = getVehicleBounds(vehicle);
          const isClear = isVehiclePathClear(vehicle, vehicles, boardSize);
          const isMatch = nextPassengerColor === vehicle.color;
          const statusLabel = disabled
            ? "Locked"
            : isClear
              ? isMatch
                ? "Board"
                : "Dock"
              : "Blocked";
          const toneClasses = isClear
            ? isMatch
              ? "ring-2 ring-emerald-300/80 shadow-emerald-400/25"
              : "ring-1 ring-white/15"
            : "border-dashed opacity-65 grayscale-[0.15]";
          const badgeClasses = isClear
            ? isMatch
              ? "bg-emerald-950/80 text-emerald-100"
              : "bg-slate-950/70 text-slate-100"
            : "bg-amber-950/80 text-amber-100";
          const actionText = disabled
            ? "Input locked until restart or exit."
            : isClear
              ? isMatch
                ? "Boards the front passenger immediately."
                : "Moves into the next open dock slot."
              : "Cannot move until the exit lane is clear.";

          return (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => onVehicleTap?.(vehicle.id)}
              disabled={disabled || !onVehicleTap}
              aria-label={`${statusLabel} ${vehicle.color} vehicle toward the ${vehicle.exitLane} exit`}
              className={`z-10 rounded-2xl border px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-black/20 transition sm:text-xs ${
                VEHICLE_STYLES[vehicle.color]
              } ${toneClasses} ${disabled ? "cursor-not-allowed opacity-60" : "hover:scale-[1.01] active:scale-[0.99]"}`}
              style={{
                gridColumn: `${bounds.minCol + 1} / ${bounds.maxCol + 2}`,
                gridRow: `${bounds.minRow + 1} / ${bounds.maxRow + 2}`,
              }}
            >
              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] ${badgeClasses}`}>
                {statusLabel}
              </span>
              <span className="mt-2 block">{vehicle.color}</span>
              <span className="mt-1 block text-[10px] opacity-80">{EXIT_LABELS[vehicle.exitLane]}</span>
              <span className="mt-2 block text-[9px] normal-case tracking-normal opacity-80 sm:text-[10px]">
                {actionText}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Matching vehicles can only leave when every cell between them and the marked exit lane is open.
      </p>
    </section>
  );
}
