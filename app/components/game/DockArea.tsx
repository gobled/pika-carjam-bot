"use client";

import type { AttemptStatus, DockState, Vehicle } from "@/app/lib/game/types";

type DockAreaProps = {
  dock: DockState;
  disabled?: boolean;
  nextPassengerColor: Vehicle["color"] | null;
  onVehicleTap?: (vehicleId: string) => void;
  status: AttemptStatus;
};

const COLOR_STYLES = {
  red: "bg-rose-500/15 text-rose-200 border-rose-400/20",
  blue: "bg-sky-500/15 text-sky-200 border-sky-400/20",
  green: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  yellow: "bg-amber-400/20 text-amber-100 border-amber-300/20",
  purple: "bg-violet-500/15 text-violet-200 border-violet-400/20",
  orange: "bg-orange-500/15 text-orange-200 border-orange-400/20",
} as const;

export function DockArea({
  dock,
  disabled = false,
  nextPassengerColor,
  onVehicleTap,
  status,
}: DockAreaProps) {
  const occupiedCount = dock.slots.filter(Boolean).length;
  const statusLabel =
    status === "won" ? "Complete" : status === "lost" ? "Locked" : "Active";

  return (
    <div className="mt-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Dock</p>
          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">
            {occupiedCount}/{dock.capacity}
          </span>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {dock.slots.map((vehicle, index) => {
          const isMatch = Boolean(
            vehicle && status === "playing" && nextPassengerColor === vehicle.color,
          );
          const statusText = vehicle
            ? isMatch
              ? "Tap to board"
              : "Waiting"
            : "Open slot";

          return (
            <button
              key={`dock-slot-${index}`}
              type="button"
              onClick={() => vehicle && onVehicleTap?.(vehicle.id)}
              disabled={!vehicle || disabled || !onVehicleTap}
              className={`flex min-h-14 flex-col items-start justify-between rounded-xl border px-2 py-2 text-left text-sm ${
                vehicle
                  ? `${COLOR_STYLES[vehicle.color]} border-solid font-semibold ${
                      isMatch ? "ring-2 ring-emerald-300/70 shadow-lg shadow-emerald-500/20" : ""
                    } ${
                      disabled
                        ? "cursor-not-allowed opacity-70"
                        : "transition hover:scale-[1.01] active:scale-[0.99]"
                    }`
                  : "border-dashed border-white/10 bg-black/20 text-slate-500"
              }`}
            >
                <div className="flex w-full items-start justify-between gap-1 text-[9px] uppercase tracking-[0.2em] opacity-80">
                  <span>{index + 1}</span>
                  {vehicle ? (
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[8px] ${
                        isMatch
                          ? "border-emerald-200/30 bg-emerald-950/70 text-emerald-100"
                          : "border-current/15 bg-black/15"
                    }`}
                  >
                    {statusText}
                  </span>
                ) : null}
                </div>

                <div>
                  <p className="text-xs font-semibold capitalize">
                    {vehicle ? vehicle.color : "Open"}
                  </p>
                </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
