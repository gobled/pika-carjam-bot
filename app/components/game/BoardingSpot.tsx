"use client";

import type { AttemptStatus, DockState } from "@/app/lib/game/types";

type BoardingSpotProps = {
  spot: DockState;
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

const COLOR_FILL = {
  red: "bg-rose-400",
  blue: "bg-sky-400",
  green: "bg-emerald-400",
  yellow: "bg-amber-300",
  purple: "bg-violet-400",
  orange: "bg-orange-400",
} as const;

export function BoardingSpot({ spot, status }: BoardingSpotProps) {
  const occupiedCount = spot.slots.filter(Boolean).length;
  const statusLabel =
    status === "won" ? "Complete" : status === "lost" ? "Locked" : "Active";

  return (
    <div className="mt-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
            Boarding Spot
          </p>
          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">
            {occupiedCount}/{spot.capacity}
          </span>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {spot.slots.map((vehicle, index) => (
          <div
            key={`spot-slot-${index}`}
            className={`flex min-h-14 flex-col items-start justify-between rounded-xl border px-2 py-2 text-sm ${
              vehicle
                ? `${COLOR_STYLES[vehicle.color]} border-solid font-semibold`
                : "border-dashed border-white/10 bg-black/20 text-slate-500"
            }`}
          >
            <div className="flex w-full items-start justify-between gap-1 text-[9px] uppercase tracking-[0.2em] opacity-80">
              <span>{index + 1}</span>
              {vehicle ? (
                <span className="rounded-full border border-current/15 bg-black/15 px-1.5 py-0.5 text-[8px]">
                  Loading
                </span>
              ) : null}
            </div>

            {vehicle ? (
              <div className="w-full">
                <p className="text-xs font-semibold capitalize">{vehicle.color}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {/* Seat fill dots */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: vehicle.seats }, (_, i) => (
                      <span
                        key={i}
                        className={`inline-block h-2 w-2 rounded-full ${
                          i < vehicle.boardedPassengers
                            ? COLOR_FILL[vehicle.color]
                            : "bg-white/15"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] opacity-60">
                    {vehicle.boardedPassengers}/{vehicle.seats}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs">Open</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
