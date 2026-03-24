"use client";

import type { AttemptStatus, PassengerQueue as PassengerQueueType } from "@/app/lib/game/types";

type PassengerQueueProps = {
  queue: PassengerQueueType;
  status: AttemptStatus;
};

const COLOR_STYLES = {
  red: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
  blue: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
  green: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  yellow: "bg-amber-400/20 text-amber-100 ring-amber-300/30",
  purple: "bg-violet-500/15 text-violet-200 ring-violet-400/30",
  orange: "bg-orange-500/15 text-orange-200 ring-orange-400/30",
} as const;

export function PassengerQueue({ queue, status }: PassengerQueueProps) {
  const nextPassenger = queue.passengers[queue.nextIndex] ?? null;
  const upcomingPassengers = queue.passengers.slice(queue.nextIndex + 1, queue.nextIndex + 4);
  const remainingCount = queue.passengers.length - queue.nextIndex;
  const statusLabel = status === "won" ? "Cleared" : status === "lost" ? "Locked" : "Live";

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <p className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-slate-400">Queue</p>
      {nextPassenger ? (
        <>
          <div
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ${COLOR_STYLES[nextPassenger.color]} ${
              status === "playing" ? "" : "opacity-80"
            }`}
          >
            {nextPassenger.color}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {upcomingPassengers.map((passenger) => (
              <div
                key={passenger.id}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 opacity-80 ${COLOR_STYLES[passenger.color]}`}
              >
                {passenger.color}
              </div>
            ))}
            {remainingCount > 4 ? (
              <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">
                +{remainingCount - 4}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
          Cleared
        </span>
      )}
      <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">
        {statusLabel}
      </span>
    </div>
  );
}
