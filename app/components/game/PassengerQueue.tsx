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
  const upcomingPassengers = queue.passengers.slice(queue.nextIndex + 1);
  const remainingCount = queue.passengers.length;
  const statusLabel =
    status === "won" ? "Queue cleared" : status === "lost" ? "Attempt locked" : "In progress";

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Passenger Queue</p>
          <h2 className="text-lg font-semibold text-white">Next riders</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            {remainingCount} remaining
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            {statusLabel}
          </span>
        </div>
      </div>

      {nextPassenger ? (
        <div className={`space-y-4 ${status === "playing" ? "" : "opacity-80"}`}>
          <div
            className={`rounded-2xl p-4 ring-1 ${COLOR_STYLES[nextPassenger.color]} ${
              status === "playing" ? "shadow-lg shadow-emerald-500/10" : "opacity-80"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.24em] opacity-80">Now boarding</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold capitalize">{nextPassenger.color}</h3>
              <span className="rounded-full border border-current/20 px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Boards now
              </span>
            </div>
            <p className="mt-2 text-sm opacity-90">
              {status === "playing"
                ? `A clear ${nextPassenger.color} vehicle will satisfy this rider and reveal the next one.`
                : `This rider remains at the front because the attempt has ended. Restart to replay the fixed queue.`}
            </p>
          </div>

          {upcomingPassengers.length > 0 ? (
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-400">Then</p>
              <div className="flex flex-wrap gap-2">
                {upcomingPassengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    className={`rounded-full px-3 py-2 text-sm font-semibold capitalize ring-1 opacity-80 ${COLOR_STYLES[passenger.color]}`}
                  >
                    {passenger.color}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Queue complete</p>
          <p className="mt-2 text-sm">
            {status === "won"
              ? "All passengers have boarded. Restart to replay the same opening order."
              : "No remaining passengers."}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        {status === "playing"
          ? "Only the rider at the front can board, even if matching colors are already waiting in the dock."
          : "The queue is locked until you restart or exit the completed run."}
      </p>
    </section>
  );
}
