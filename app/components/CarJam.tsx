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
import { getNextPassenger } from "@/app/lib/game/validation";

type CarJamProps = {
  onExit: () => void;
};

export function CarJam({ onExit }: CarJamProps) {
  const [attempt, setAttempt] = useState(() => createInitialAttempt());
  const nextPassenger = getNextPassenger(attempt);
  const isPlaying = attempt.status === "playing";
  const remainingPassengers =
    attempt.passengerQueue.passengers.length - attempt.passengerQueue.nextIndex;

  const handleParkingVehicleTap = (vehicleId: string) => {
    setAttempt((currentAttempt) => resolveParkingVehicleTap(currentAttempt, vehicleId));
  };

  const handleDockVehicleTap = (vehicleId: string) => {
    setAttempt((currentAttempt) => resolveDockVehicleTap(currentAttempt, vehicleId));
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black px-2.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-[max(env(safe-area-inset-top),0.5rem)] text-slate-100">
      <div className="mx-auto flex h-full w-full max-w-md flex-col gap-2">
        <header className="rounded-[20px] border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-300">Level 1</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">
                  {nextPassenger ? `${nextPassenger.color} next` : "Queue clear"}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-slate-300">
                  {remainingPassengers} left
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAttempt(restartAttempt())}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-emerald-400"
              >
                {isPlaying ? "Restart" : "Replay"}
              </button>
              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-black/50"
              >
                Exit
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-[20px] border border-white/10 bg-white/5 px-3 py-2">
          <PassengerQueue queue={attempt.passengerQueue} status={attempt.status} />
          <DockArea
            dock={attempt.dock}
            disabled={attempt.status !== "playing"}
            nextPassengerColor={nextPassenger?.color ?? null}
            onVehicleTap={handleDockVehicleTap}
            status={attempt.status}
          />
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

        
      </div>
    </div>
  );
}
