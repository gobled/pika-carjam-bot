"use client";

import { useState } from "react";
import { DockArea } from "@/app/components/game/DockArea";
import { GameBoard } from "@/app/components/game/GameBoard";
import { GameOverlay } from "@/app/components/game/GameOverlay";
import { PassengerQueue } from "@/app/components/game/PassengerQueue";
import {
  createInitialAttempt,
  resolveDockVehicleTap,
  resolveParkingVehicleTap,
  restartAttempt,
} from "@/app/lib/game/gameState";
import { PLAYABLE_LEVEL_LAYOUT } from "@/app/lib/game/levelLayout";
import { getNextPassenger } from "@/app/lib/game/validation";

type CarJamProps = {
  onExit: () => void;
};

export function CarJam({ onExit }: CarJamProps) {
  const [attempt, setAttempt] = useState(() => createInitialAttempt());
  const nextPassenger = getNextPassenger(attempt);
  const isPlaying = attempt.status === "playing";
  const remainingPassengers = attempt.passengerQueue.passengers.length;

  const targetDescription = nextPassenger
    ? isPlaying
      ? `Only a clear ${nextPassenger.color} vehicle can board right now.`
      : `The ${nextPassenger.color} rider is still waiting because the attempt has ended.`
    : "Every passenger in the fixed queue has already boarded.";

  const handleParkingVehicleTap = (vehicleId: string) => {
    setAttempt((currentAttempt) => resolveParkingVehicleTap(currentAttempt, vehicleId));
  };

  const handleDockVehicleTap = (vehicleId: string) => {
    setAttempt((currentAttempt) => resolveDockVehicleTap(currentAttempt, vehicleId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] text-slate-100 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:gap-4">
        <header className="rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Playable level</p>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {PLAYABLE_LEVEL_LAYOUT.title}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Match the front passenger with a clear vehicle, stage non-matches in the dock, and
                replay the same fixed layout after every win or loss.
              </p>
            </div>

            <button
              type="button"
              onClick={onExit}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/50"
            >
              Exit
            </button>
          </div>
        </header>

        <section className="grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-3 sm:grid-cols-2 sm:p-4">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Current target</p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {nextPassenger ? `${nextPassenger.color} passenger` : "Queue complete"}
            </h2>
            <p className="mt-2 text-sm text-emerald-100/90">{targetDescription}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-100/90">
              <span className="rounded-full border border-emerald-200/20 bg-black/15 px-2.5 py-1">
                {remainingPassengers} riders left
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-black/15 px-2.5 py-1">
                Dock capacity: 3
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tap rules</p>
            <p className="mt-2 text-sm text-slate-200">
              {isPlaying
                ? "Blocked vehicles stay put. Clear matches resolve from the lot, while clear non-matching vehicles move into the next open dock slot and wait for a later tap."
                : "This run is complete. Board and dock input stay locked until you restart or exit."}
            </p>
          </div>
        </section>

        <GameBoard
          boardSize={attempt.boardSize}
          vehicles={attempt.vehicles}
          disabled={attempt.status !== "playing"}
          nextPassengerColor={nextPassenger?.color ?? null}
          onVehicleTap={handleParkingVehicleTap}
        />

        <GameOverlay
          feedback={attempt.selectedFeedback}
          status={attempt.status}
          lossReason={attempt.lossReason}
          onRestart={() => setAttempt(restartAttempt())}
          onExit={onExit}
        />

        <PassengerQueue queue={attempt.passengerQueue} status={attempt.status} />

        <DockArea
          dock={attempt.dock}
          disabled={attempt.status !== "playing"}
          nextPassengerColor={nextPassenger?.color ?? null}
          onVehicleTap={handleDockVehicleTap}
          status={attempt.status}
        />

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Attempt controls</p>
          <p className="mt-2 text-sm text-slate-300">
            Restart always replays the same opening layout, restores the original passenger order,
            and clears every dock slot, resetting the dock strategy puzzle from the start.
          </p>

          <button
            type="button"
            onClick={() => setAttempt(restartAttempt())}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            {isPlaying ? "Restart attempt" : "Play again"}
          </button>
        </div>
      </div>
    </div>
  );
}
