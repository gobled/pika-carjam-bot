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
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Dock</p>
          <h2 className="text-lg font-semibold text-white">Holding area</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            {occupiedCount}/{dock.capacity}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
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
              className={`flex min-h-24 flex-col items-start justify-between rounded-2xl border px-3 py-3 text-left text-sm sm:min-h-28 ${
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
              <div className="flex w-full items-start justify-between gap-2 text-[11px] uppercase tracking-[0.2em] opacity-80">
                <span>Slot {index + 1}</span>
                {vehicle ? (
                  <span
                    className={`rounded-full border px-2 py-1 ${
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
                <p className="text-base font-semibold capitalize">
                  {vehicle ? `${vehicle.color} vehicle` : "Available"}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  {vehicle
                    ? isMatch
                      ? "This docked vehicle now matches the queue and can board on tap."
                      : "Stored until its color reaches the front of the queue."
                    : "The next clear non-matching vehicle will park here."}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {status === "playing"
          ? "Docked vehicles never auto-resolve. When a stored color reaches the front, it still needs an explicit tap to board."
          : "Dock interactions are locked until you restart or exit the completed run."}
      </p>
    </section>
  );
}
