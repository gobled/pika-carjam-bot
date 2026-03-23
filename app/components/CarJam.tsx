"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createGameStateFromLevel, getLevelById, getNextLevelMetadata, getStarRating } from "@/app/lib/levels";
import { getHintSuggestion, moveVehicle, resetGame, undoMove, validateMove } from "@/app/lib/game";
import type { GameState, VehicleState } from "@/app/lib/game";
import type { TelegramSession } from "@/app/lib/telegram";

const COLOR_LABELS: Record<string, string> = {
  sun: "Amber",
  mint: "Mint",
  berry: "Berry",
  ocean: "Ocean",
  gold: "Gold",
  plum: "Plum",
  coral: "Coral",
};

const COLOR_STYLES: Record<string, { chip: string; body: string; glow: string }> = {
  sun: { chip: "from-amber-300 to-orange-400 text-orange-950", body: "#f59e0b", glow: "rgba(245,158,11,0.28)" },
  mint: { chip: "from-emerald-300 to-teal-400 text-emerald-950", body: "#10b981", glow: "rgba(16,185,129,0.28)" },
  berry: { chip: "from-fuchsia-300 to-pink-400 text-pink-950", body: "#ec4899", glow: "rgba(236,72,153,0.28)" },
  ocean: { chip: "from-sky-300 to-cyan-400 text-sky-950", body: "#0ea5e9", glow: "rgba(14,165,233,0.28)" },
  gold: { chip: "from-yellow-200 to-amber-300 text-amber-950", body: "#fbbf24", glow: "rgba(251,191,36,0.28)" },
  plum: { chip: "from-violet-300 to-purple-400 text-purple-950", body: "#8b5cf6", glow: "rgba(139,92,246,0.28)" },
  coral: { chip: "from-rose-300 to-orange-300 text-rose-950", body: "#fb7185", glow: "rgba(251,113,133,0.28)" },
};

const DEPART_MS = 420;

type VictoryPayload = {
  levelId: string;
  moveCount: number;
  starsEarned: number;
  nextLevelId: string | null;
};

type CarJamProps = {
  levelId: string;
  session: TelegramSession;
  soundEnabled: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onVictory: (payload: VictoryPayload) => void;
};

type DragStart = {
  x: number;
  y: number;
};

type DepartingVehicle = VehicleState & {
  startedAt: number;
};

function vehicleStyle(vehicle: VehicleState, boardWidth: number, boardHeight: number) {
  return {
    left: `${(vehicle.x / boardWidth) * 100}%`,
    top: `${(vehicle.y / boardHeight) * 100}%`,
    width: `${((vehicle.orientation === "horizontal" ? vehicle.length : 1) / boardWidth) * 100}%`,
    height: `${((vehicle.orientation === "vertical" ? vehicle.length : 1) / boardHeight) * 100}%`,
  } as const;
}

function QueueChip({ colorKey, active }: { colorKey: string; active?: boolean }) {
  const style = COLOR_STYLES[colorKey] ?? COLOR_STYLES.sun;
  return (
    <div
      className={`flex h-12 min-w-12 items-center justify-center rounded-2xl bg-gradient-to-br px-3 text-xs font-black uppercase tracking-[0.2em] shadow-lg transition ${style.chip} ${
        active ? "scale-105 ring-2 ring-white/60" : "opacity-70"
      }`}
    >
      {colorKey.slice(0, 2)}
    </div>
  );
}

function CapacityDots({ occupancy, capacity }: { occupancy: number; capacity: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: capacity }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 w-2.5 rounded-full ${index < occupancy ? "bg-white" : "bg-white/30"}`}
        />
      ))}
    </div>
  );
}

export function CarJam({ levelId, session, soundEnabled, onBack, onOpenSettings, onVictory }: CarJamProps) {
  const level = useMemo(() => getLevelById(levelId), [levelId]);
  const [gameState, setGameState] = useState<GameState>(() => createGameStateFromLevel(levelId));
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [hintText, setHintText] = useState<string>("");
  const [departingVehicles, setDepartingVehicles] = useState<DepartingVehicle[]>([]);
  const dragStartRef = useRef<DragStart | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setGameState(createGameStateFromLevel(levelId));
    setSelectedVehicleId(null);
    setMessage("");
    setHintText("");
    setDepartingVehicles([]);
  }, [levelId]);

  useEffect(() => {
    if (!level || !gameState.hasWon) {
      return;
    }

    const nextLevel = getNextLevelMetadata(levelId);
    onVictory({
      levelId,
      moveCount: gameState.moveCount,
      starsEarned: getStarRating(level, gameState.moveCount),
      nextLevelId: nextLevel?.nextLevelId ?? null,
    });
  }, [gameState.hasWon, gameState.moveCount, level, levelId, onVictory]);

  const selectedVehicle = gameState.vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;
  const activePassenger = gameState.passengerQueue[0] ?? null;
  const upcomingQueue = gameState.passengerQueue.slice(1, 6);
  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;
  const displayName = session.user.firstName || session.user.username || "Driver";

  const pushDepartures = (previous: GameState, next: GameState) => {
    const removed = previous.vehicles.filter((vehicle) => !next.vehicles.some((candidate) => candidate.id === vehicle.id));
    if (!removed.length) {
      return;
    }

    setDepartingVehicles((current) => [...current, ...removed.map((vehicle) => ({ ...vehicle, startedAt: Date.now() }))]);
    window.setTimeout(() => {
      setDepartingVehicles((current) => current.filter((vehicle) => !removed.some((gone) => gone.id === vehicle.id)));
    }, DEPART_MS);
  };

  const applyMove = (vehicleId: string, delta: number) => {
    let attempt = delta;
    while (attempt !== 0) {
      const validation = validateMove(gameState, { vehicleId, delta: attempt });
      if (validation.ok) {
        const result = moveVehicle(gameState, { vehicleId, delta: attempt });
        if (!result.ok) {
          setMessage(result.message);
          return;
        }

        pushDepartures(gameState, result.state);
        setGameState(result.state);
        setSelectedVehicleId(result.state.vehicles.some((vehicle) => vehicle.id === vehicleId) ? vehicleId : null);
        setHintText("");

        if (result.move.boardingEvents.length > 0) {
          const departures = result.move.boardingEvents.filter((event) => event.type === "departed");
          const boardings = result.move.boardingEvents.filter((event) => event.type === "boarded");
          setMessage(
            departures.length > 0
              ? `${departures.length} full car${departures.length > 1 ? "s" : ""} departed. Queue advanced by ${boardings.length}.`
              : `Boarded ${boardings.length} passenger${boardings.length > 1 ? "s" : ""}.`,
          );
        } else {
          setMessage("Lane updated. No passenger could board yet.");
        }
        return;
      }

      attempt += attempt > 0 ? -1 : 1;
    }

    setMessage(`That move is blocked for ${vehicleId}.`);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>, vehicle: VehicleState) => {
    if (!dragStartRef.current || !boardRef.current) {
      return;
    }

    const start = dragStartRef.current;
    dragStartRef.current = null;
    const rect = boardRef.current.getBoundingClientRect();
    const deltaPixels = vehicle.orientation === "horizontal" ? event.clientX - start.x : event.clientY - start.y;
    const axisSize = vehicle.orientation === "horizontal" ? rect.width / boardWidth : rect.height / boardHeight;
    const snapped = Math.round(deltaPixels / axisSize);

    if (snapped !== 0) {
      applyMove(vehicle.id, snapped);
    }
  };

  const handleUndo = () => {
    const result = undoMove(gameState);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setGameState(result.state);
    setHintText("");
    setMessage("Undid the last slide.");
  };

  const handleRestart = () => {
    setGameState(resetGame(gameState));
    setSelectedVehicleId(null);
    setHintText("");
    setMessage("Level restarted.");
  };

  const handleHint = () => {
    const hint = getHintSuggestion(gameState);
    if (!hint) {
      setHintText("No hint available from this state.");
      return;
    }

    setSelectedVehicleId(hint.vehicleId);
    setHintText(hint.explanation);
    setMessage(`Hint: ${hint.vehicleId} ${hint.delta > 0 ? "→" : "←/↑"} ${Math.abs(hint.delta)}.`);
  };

  if (!level) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 py-4 text-slate-100">
      <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/85 p-4 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Car Jam Color</p>
            <h1 className="mt-2 text-2xl font-black text-white">{level.levelId.replace("tutorial-", "Level ")}</h1>
            <p className="mt-1 text-sm text-slate-300">Hi {displayName}. Clear the queue by opening pickup lanes for matching cars.</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back
          </button>
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Passenger queue</p>
              <p className="mt-1 text-sm text-slate-300">Only the first rider can board. Cars auto-load when they have a clear lane to the top curb.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
              {gameState.passengerQueue.length} left
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            {activePassenger ? <QueueChip colorKey={activePassenger} active /> : <div className="text-sm text-emerald-200">Queue cleared!</div>}
            {upcomingQueue.map((colorKey, index) => (
              <QueueChip key={`${colorKey}-${index}`} colorKey={colorKey} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/85 p-4 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
          <span>Pickup curb</span>
          <span>{soundEnabled ? "Sound On" : "Sound Off"}</span>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(15,23,42,0.96))] p-3">
          <div className="mb-3 rounded-xl border border-dashed border-emerald-300/30 bg-emerald-400/10 py-2 text-center text-xs font-bold uppercase tracking-[0.32em] text-emerald-100">
            Boarding lane
          </div>

          <div
            ref={boardRef}
            className="relative mx-auto aspect-square w-full max-w-[340px] rounded-[1.25rem] bg-slate-800/90"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
          >
            {Array.from({ length: boardHeight }).map((_, row) =>
              Array.from({ length: boardWidth }).map((__, column) => (
                <div
                  key={`${column}-${row}`}
                  className="absolute rounded-lg border border-white/5 bg-white/[0.035]"
                  style={{
                    left: `${(column / boardWidth) * 100}%`,
                    top: `${(row / boardHeight) * 100}%`,
                    width: `${100 / boardWidth}%`,
                    height: `${100 / boardHeight}%`,
                  }}
                />
              )),
            )}

            {gameState.vehicles.map((vehicle) => {
              const color = COLOR_STYLES[vehicle.colorKey] ?? COLOR_STYLES.sun;
              const isSelected = vehicle.id === selectedVehicleId;
              const isActiveColor = activePassenger === vehicle.colorKey;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                  onPointerDown={handlePointerDown}
                  onPointerUp={(event) => handlePointerUp(event, vehicle)}
                  className={`absolute z-10 rounded-[1.1rem] border text-left transition-all duration-300 ease-out ${
                    isSelected ? "border-white shadow-xl" : "border-black/20"
                  } ${isActiveColor ? "ring-2 ring-emerald-300/70" : ""}`}
                  style={{
                    ...vehicleStyle(vehicle, boardWidth, boardHeight),
                    background: `linear-gradient(135deg, ${color.body}, rgba(255,255,255,0.14))`,
                    boxShadow: `0 10px 28px ${color.glow}`,
                    touchAction: "none",
                  }}
                >
                  <div className="flex h-full flex-col justify-between rounded-[1rem] border border-white/15 bg-black/10 p-2">
                    <div className="flex items-start justify-between gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/95">
                      <span>{COLOR_LABELS[vehicle.colorKey] ?? vehicle.colorKey}</span>
                      <span>{vehicle.orientation === "horizontal" ? "↔" : "↕"}</span>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <CapacityDots occupancy={vehicle.occupancy} capacity={vehicle.capacity} />
                      <span className="rounded-full bg-black/20 px-2 py-1 text-[10px] font-bold text-white/90">
                        {vehicle.occupancy}/{vehicle.capacity}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {departingVehicles.map((vehicle) => {
              const color = COLOR_STYLES[vehicle.colorKey] ?? COLOR_STYLES.sun;
              return (
                <div
                  key={`depart-${vehicle.id}-${vehicle.startedAt}`}
                  className="pointer-events-none absolute z-20 rounded-[1.1rem] border border-white/40 opacity-0 transition-all duration-500 ease-out"
                  style={{
                    ...vehicleStyle(vehicle, boardWidth, boardHeight),
                    background: `linear-gradient(135deg, ${color.body}, rgba(255,255,255,0.2))`,
                    transform: "translateY(-22px) scale(0.92)",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <button type="button" onClick={handleRestart} className="rounded-2xl bg-white/5 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Restart
          </button>
          <button type="button" onClick={handleUndo} className="rounded-2xl bg-white/5 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Undo
          </button>
          <button type="button" onClick={handleHint} className="rounded-2xl bg-emerald-400/15 px-3 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20">
            Hint
          </button>
          <button type="button" onClick={onOpenSettings} className="rounded-2xl bg-white/5 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Settings
          </button>
        </div>

        {selectedVehicle && (
          <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">Selected: {selectedVehicle.id}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {COLOR_LABELS[selectedVehicle.colorKey] ?? selectedVehicle.colorKey} car · slides {selectedVehicle.orientation === "horizontal" ? "left / right" : "up / down"} · capacity {selectedVehicle.occupancy}/{selectedVehicle.capacity}
                </p>
              </div>
              <CapacityDots occupancy={selectedVehicle.occupancy} capacity={selectedVehicle.capacity} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyMove(selectedVehicle.id, -1)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {selectedVehicle.orientation === "horizontal" ? "← Left" : "↑ Up"}
              </button>
              <button
                type="button"
                onClick={() => applyMove(selectedVehicle.id, 1)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {selectedVehicle.orientation === "horizontal" ? "Right →" : "Down ↓"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
          <p className="font-semibold text-white">Status</p>
          <p className="mt-2">{message || "Swipe a car along its axis or use the directional buttons for precise mobile play."}</p>
          {hintText && <p className="mt-2 text-emerald-200">{hintText}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full bg-white/5 px-3 py-1">Moves: {gameState.moveCount}</span>
            <span className="rounded-full bg-white/5 px-3 py-1">Theme: {level.themeId}</span>
            <span className="rounded-full bg-white/5 px-3 py-1">Board: {boardWidth}×{boardHeight}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
