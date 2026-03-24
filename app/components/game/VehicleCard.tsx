"use client";

import { getVehicleBounds } from "@/app/lib/game/pathfinding";
import type { Vehicle } from "@/app/lib/game/types";

type VehicleCardProps = {
  vehicle: Vehicle;
  isClear: boolean;
  isMatch: boolean;
  disabled: boolean;
  onTap?: (vehicleId: string) => void;
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
  up: "UP",
  right: "RIGHT",
  down: "DOWN",
  left: "LEFT",
};

export function VehicleCard({ vehicle, isClear, isMatch, disabled, onTap }: VehicleCardProps) {
  const bounds = getVehicleBounds(vehicle);

  const statusLabel = disabled
    ? "LOCKED"
    : isClear
      ? "EXIT"
      : "BLOCKED";

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

  return (
    <button
      key={vehicle.id}
      type="button"
      onClick={() => onTap?.(vehicle.id)}
      disabled={disabled || !onTap}
      aria-label={`${statusLabel} ${vehicle.color} ${vehicle.type} (${vehicle.seats} seats) toward the ${vehicle.exitLane} exit`}
      className={`z-10 flex flex-col justify-between rounded-xl border px-1.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-black/20 transition sm:rounded-2xl sm:px-2 sm:py-2 sm:text-[11px] ${
        VEHICLE_STYLES[vehicle.color]
      } ${toneClasses} ${disabled ? "cursor-not-allowed opacity-60" : "hover:scale-[1.01] active:scale-[0.99]"}`}
      style={{
        gridColumn: `${bounds.minCol + 1} / ${bounds.maxCol + 2}`,
        gridRow: `${bounds.minRow + 1} / ${bounds.maxRow + 2}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[8px] sm:px-2 sm:py-1 sm:text-[9px] ${badgeClasses}`}>
          {statusLabel}
        </span>
        <span className="text-[8px] opacity-70 sm:text-[10px]">
          {EXIT_LABELS[vehicle.exitLane]}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="block truncate text-[10px] sm:text-sm">{vehicle.type}</span>
        <span className="block text-[7px] opacity-60 sm:text-[9px]">
          {vehicle.seats} seats · {vehicle.length}×1
        </span>
      </div>
    </button>
  );
}
