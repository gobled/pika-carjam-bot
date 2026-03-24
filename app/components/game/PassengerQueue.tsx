"use client";

import type { AttemptStatus, PassengerQueue as PassengerQueueType } from "@/app/lib/game/types";

type PassengerQueueProps = {
  queue: PassengerQueueType;
  status: AttemptStatus;
};

const COLOR_DOT = {
  red: "bg-rose-500",
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  purple: "bg-violet-500",
  orange: "bg-orange-500",
} as const;

const COLOR_RING = {
  red: "ring-rose-400/60",
  blue: "ring-sky-400/60",
  green: "ring-emerald-400/60",
  yellow: "ring-amber-300/60",
  purple: "ring-violet-400/60",
  orange: "ring-orange-400/60",
} as const;

export function PassengerQueue({ queue, status }: PassengerQueueProps) {
  const remaining = queue.passengers.slice(queue.nextIndex);
  const statusLabel = status === "won" ? "Cleared" : status === "lost" ? "Locked" : "Live";

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <p className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-slate-400">Queue</p>

      {remaining.length > 0 ? (
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {remaining.map((passenger, i) => (
            <span
              key={passenger.id}
              title={passenger.color}
              className={`shrink-0 inline-block rounded-full transition-all ${
                i === 0
                  ? `h-5 w-5 ring-2 shadow-md ${COLOR_DOT[passenger.color]} ${COLOR_RING[passenger.color]}`
                  : `h-3.5 w-3.5 opacity-70 ${COLOR_DOT[passenger.color]}`
              }`}
            />
          ))}
        </div>
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

