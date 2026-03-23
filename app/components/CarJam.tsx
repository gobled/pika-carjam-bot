"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createGameStateFromLevel,
  getLevelById,
  getNextLevelMetadata,
  getStarRating,
} from "@/app/lib/levels";
import {
  canVehicleReachBoardingLane,
  getHintSuggestion,
  moveVehicle,
  resetGame,
  undoMove,
  validateMove,
} from "@/app/lib/game";
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

const COLOR_SHORT_LABELS: Record<string, string> = {
  sun: "AMB",
  mint: "MNT",
  berry: "BER",
  ocean: "SEA",
  gold: "GLD",
  plum: "PLM",
  coral: "COR",
};

const COLOR_STYLES: Record<
  string,
  { chip: string; chipMuted: string; chipAura: string; body: string; bodyDark: string; glow: string; ring: string; lane: string }
> = {
  sun: {
    chip: "from-amber-200 via-amber-300 to-orange-400 text-orange-950",
    chipMuted: "from-amber-200/40 to-orange-300/40 text-orange-100",
    chipAura: "rgba(251,191,36,0.45)",
    body: "#f59e0b",
    bodyDark: "#c2410c",
    glow: "rgba(245,158,11,0.3)",
    ring: "rgba(253,224,71,0.85)",
    lane: "rgba(251,191,36,0.22)",
  },
  mint: {
    chip: "from-emerald-200 via-emerald-300 to-teal-400 text-emerald-950",
    chipMuted: "from-emerald-200/40 to-teal-300/40 text-emerald-100",
    chipAura: "rgba(45,212,191,0.45)",
    body: "#10b981",
    bodyDark: "#0f766e",
    glow: "rgba(16,185,129,0.3)",
    ring: "rgba(110,231,183,0.88)",
    lane: "rgba(16,185,129,0.22)",
  },
  berry: {
    chip: "from-fuchsia-200 via-pink-300 to-rose-400 text-rose-950",
    chipMuted: "from-fuchsia-200/40 to-rose-300/40 text-pink-100",
    chipAura: "rgba(244,114,182,0.45)",
    body: "#ec4899",
    bodyDark: "#be185d",
    glow: "rgba(236,72,153,0.28)",
    ring: "rgba(251,113,133,0.88)",
    lane: "rgba(236,72,153,0.2)",
  },
  ocean: {
    chip: "from-sky-200 via-sky-300 to-cyan-400 text-sky-950",
    chipMuted: "from-sky-200/40 to-cyan-300/40 text-sky-100",
    chipAura: "rgba(56,189,248,0.45)",
    body: "#0ea5e9",
    bodyDark: "#0369a1",
    glow: "rgba(14,165,233,0.32)",
    ring: "rgba(125,211,252,0.9)",
    lane: "rgba(14,165,233,0.2)",
  },
  gold: {
    chip: "from-yellow-100 via-amber-200 to-yellow-300 text-amber-950",
    chipMuted: "from-yellow-100/40 to-amber-200/40 text-yellow-100",
    chipAura: "rgba(253,224,71,0.42)",
    body: "#fbbf24",
    bodyDark: "#d97706",
    glow: "rgba(251,191,36,0.3)",
    ring: "rgba(254,240,138,0.9)",
    lane: "rgba(250,204,21,0.18)",
  },
  plum: {
    chip: "from-violet-200 via-violet-300 to-purple-400 text-purple-950",
    chipMuted: "from-violet-200/40 to-purple-300/40 text-violet-100",
    chipAura: "rgba(167,139,250,0.46)",
    body: "#8b5cf6",
    bodyDark: "#6d28d9",
    glow: "rgba(139,92,246,0.32)",
    ring: "rgba(196,181,253,0.9)",
    lane: "rgba(139,92,246,0.2)",
  },
  coral: {
    chip: "from-rose-200 via-rose-300 to-orange-300 text-rose-950",
    chipMuted: "from-rose-200/40 to-orange-200/40 text-rose-100",
    chipAura: "rgba(251,146,60,0.42)",
    body: "#fb7185",
    bodyDark: "#ea580c",
    glow: "rgba(251,113,133,0.3)",
    ring: "rgba(253,164,175,0.88)",
    lane: "rgba(251,113,133,0.2)",
  },
};

const DEPART_MS = 420;
const READY_FLASH_MS = 850;
const QUEUE_SHRINK_MS = 520;

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

function QueueChip({ colorKey, active, subdued }: { colorKey: string; active?: boolean; subdued?: boolean }) {
  const style = COLOR_STYLES[colorKey] ?? COLOR_STYLES.sun;

  return (
    <div
      className={`relative flex items-center gap-3 rounded-[1.5rem] border px-3 py-3 shadow-lg transition-all duration-300 ${
        active
          ? "queue-chip-active min-w-[9.25rem] scale-100 border-white/30 bg-slate-950/75"
          : `min-w-[4.5rem] border-white/8 bg-slate-950/45 ${subdued ? "scale-[0.92] opacity-45" : "opacity-70"}`
      }`}
      style={{ boxShadow: active ? `0 0 0 1px rgba(255,255,255,0.08), 0 18px 40px ${style.chipAura}` : undefined }}
    >
      {active && (
        <div className="absolute -top-2 left-3 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/90">
          Now boarding
        </div>
      )}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-black uppercase tracking-[0.22em] ${
          active ? style.chip : style.chipMuted
        }`}
      >
        {COLOR_SHORT_LABELS[colorKey] ?? colorKey.slice(0, 3)}
      </div>
      {active && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Front rider</p>
          <p className="text-lg font-black text-white">{COLOR_LABELS[colorKey] ?? colorKey}</p>
        </div>
      )}
    </div>
  );
}

function CapacityDots({ occupancy, capacity, bright = false }: { occupancy: number; capacity: number; bright?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: capacity }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 w-2.5 rounded-full border ${
            index < occupancy
              ? bright
                ? "border-white/80 bg-white shadow-[0_0_10px_rgba(255,255,255,0.45)]"
                : "border-white/70 bg-white"
              : "border-white/25 bg-white/15"
          }`}
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
  const [readyCelebrationVehicleId, setReadyCelebrationVehicleId] = useState<string | null>(null);
  const [queueAnimating, setQueueAnimating] = useState(false);
  const dragStartRef = useRef<DragStart | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const previousReadyIdsRef = useRef<string[]>([]);

  useEffect(() => {
    setGameState(createGameStateFromLevel(levelId));
    setSelectedVehicleId(null);
    setMessage("");
    setHintText("");
    setDepartingVehicles([]);
    setReadyCelebrationVehicleId(null);
    setQueueAnimating(false);
    previousReadyIdsRef.current = [];
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

  const matchingVehicles = useMemo(
    () => gameState.vehicles.filter((vehicle) => vehicle.colorKey === activePassenger),
    [activePassenger, gameState.vehicles],
  );
  const readyVehicleIds = useMemo(
    () => matchingVehicles.filter((vehicle) => canVehicleReachBoardingLane(gameState, vehicle)).map((vehicle) => vehicle.id),
    [gameState, matchingVehicles],
  );
  const primaryMatchingVehicleId = readyVehicleIds[0] ?? matchingVehicles[0]?.id ?? null;
  const activeColorStyle = COLOR_STYLES[activePassenger ?? "sun"] ?? COLOR_STYLES.sun;

  useEffect(() => {
    const newReadyId = readyVehicleIds.find((vehicleId) => !previousReadyIdsRef.current.includes(vehicleId)) ?? null;
    if (newReadyId) {
      setReadyCelebrationVehicleId(newReadyId);
      const timeout = window.setTimeout(() => setReadyCelebrationVehicleId((current) => (current === newReadyId ? null : current)), READY_FLASH_MS);
      return () => window.clearTimeout(timeout);
    }

    previousReadyIdsRef.current = readyVehicleIds;
    return undefined;
  }, [readyVehicleIds]);

  useEffect(() => {
    previousReadyIdsRef.current = readyVehicleIds;
  }, [readyVehicleIds]);

  useEffect(() => {
    if (!gameState.boardingEvents.length) {
      return;
    }

    setQueueAnimating(true);
    const timeout = window.setTimeout(() => setQueueAnimating(false), QUEUE_SHRINK_MS);
    return () => window.clearTimeout(timeout);
  }, [gameState.boardingEvents]);

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
              ? `${COLOR_LABELS[result.move.boardingEvents[0]?.queueColor ?? "sun"] ?? "Matching"} car boarded and rolled out. Queue advanced by ${boardings.length}.`
              : `${COLOR_LABELS[result.move.boardingEvents[0]?.queueColor ?? "sun"] ?? "Matching"} passenger boarded immediately.`,
          );
        } else if (activePassenger) {
          setMessage(`Open a clean lane for the ${COLOR_LABELS[activePassenger] ?? activePassenger} rider.`);
        } else {
          setMessage("Lane updated.");
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
            <p className="mt-1 text-sm text-slate-300">Hi {displayName}. Match the front rider to their car and open a straight lane to dispatch it.</p>
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
              <p className="mt-1 text-sm font-semibold text-white">Focus the first rider. Their matching car is always lit on the board.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
              {gameState.passengerQueue.length} left
            </div>
          </div>

          <div className={`mt-4 flex items-center gap-2 overflow-x-auto pb-1 ${queueAnimating ? "queue-shrink" : ""}`}>
            {activePassenger ? <QueueChip colorKey={activePassenger} active /> : <div className="text-sm text-emerald-200">Queue cleared!</div>}
            {upcomingQueue.map((colorKey, index) => (
              <QueueChip key={`${colorKey}-${index}`} colorKey={colorKey} subdued />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/85 p-4 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Boarding route</p>
            <p className="mt-1 text-sm font-semibold text-white">Move the glowing match until it can drive straight up into pickup.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            {soundEnabled ? "Sound on" : "Sound off"}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(15,23,42,0.96))] p-3">
          <div
            className={`mb-3 rounded-xl border px-3 py-3 text-center transition-all ${readyVehicleIds.length ? "boarding-lane-ready" : ""}`}
            style={{
              borderColor: readyVehicleIds.length ? activeColorStyle.ring : "rgba(110,231,183,0.3)",
              background: `linear-gradient(180deg, ${readyVehicleIds.length ? activeColorStyle.lane : "rgba(16,185,129,0.12)"}, rgba(15,23,42,0.35))`,
              boxShadow: readyVehicleIds.length ? `0 0 28px ${activeColorStyle.glow}` : undefined,
            }}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.36em] text-white/80">Pickup exit</p>
            <p className="mt-1 text-sm font-semibold text-white">Clear a straight path upward</p>
            {readyVehicleIds.length > 0 && activePassenger && (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">{COLOR_LABELS[activePassenger] ?? activePassenger} car ready to board</p>
            )}
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
              const isPrimaryMatch = vehicle.id === primaryMatchingVehicleId;
              const isReady = readyVehicleIds.includes(vehicle.id);
              const isCelebratingReady = vehicle.id === readyCelebrationVehicleId;
              const showGuideArrow = isReady && isPrimaryMatch;

              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                  onPointerDown={handlePointerDown}
                  onPointerUp={(event) => handlePointerUp(event, vehicle)}
                  className={`absolute z-10 rounded-[1.1rem] border text-left transition-all duration-300 ease-out ${
                    isSelected ? "border-white shadow-xl" : "border-black/15"
                  } ${isPrimaryMatch ? "car-match-pulse" : ""} ${isReady ? "car-ready" : ""} ${isCelebratingReady ? "car-ready-burst" : ""}`}
                  style={{
                    ...vehicleStyle(vehicle, boardWidth, boardHeight),
                    background: `linear-gradient(135deg, ${color.body}, ${color.bodyDark})`,
                    boxShadow: isReady
                      ? `0 0 0 2px ${color.ring}, 0 18px 34px ${color.glow}`
                      : isPrimaryMatch
                        ? `0 0 0 2px ${color.ring}66, 0 14px 30px ${color.glow}`
                        : `0 10px 28px ${color.glow}`,
                    touchAction: "none",
                    transform: isSelected ? "scale(1.02)" : undefined,
                  }}
                >
                  {showGuideArrow && (
                    <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 text-center">
                      <div className="boarding-arrow text-lg text-white">↑</div>
                      <div className="rounded-full border border-white/15 bg-slate-950/80 px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/85">
                        Go to pickup
                      </div>
                    </div>
                  )}
                  <div className="flex h-full flex-col justify-between rounded-[1rem] border border-white/15 bg-black/10 p-2.5">
                    <div className="flex items-start justify-between gap-2 text-white/95">
                      <div>
                        <p className="text-[0.72rem] font-black uppercase tracking-[0.26em]">{COLOR_SHORT_LABELS[vehicle.colorKey] ?? vehicle.colorKey.slice(0, 3)}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{vehicle.id}</p>
                      </div>
                      <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[11px] font-black">
                        {vehicle.orientation === "horizontal" ? "↔" : "↕"}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Seats</p>
                        <div className="mt-1">
                          <CapacityDots occupancy={vehicle.occupancy} capacity={vehicle.capacity} bright={isPrimaryMatch || isReady} />
                        </div>
                      </div>
                      <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-xs font-black text-white/95">
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
                  className="car-departing pointer-events-none absolute z-20 rounded-[1.1rem] border border-white/40"
                  style={{
                    ...vehicleStyle(vehicle, boardWidth, boardHeight),
                    background: `linear-gradient(135deg, ${color.body}, ${color.bodyDark})`,
                    boxShadow: `0 0 0 2px ${color.ring}, 0 18px 34px ${color.glow}`,
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
          <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-slate-950/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">{selectedVehicle.id}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {COLOR_LABELS[selectedVehicle.colorKey] ?? selectedVehicle.colorKey} · {selectedVehicle.orientation === "horizontal" ? "left / right" : "up / down"}
                </p>
              </div>
              <CapacityDots occupancy={selectedVehicle.occupancy} capacity={selectedVehicle.capacity} bright />
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

        <div className="mt-4 flex flex-col gap-2 rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-3 text-sm text-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/60">Boarding feed</p>
              <p className="mt-1 text-sm text-white/85">{message || (activePassenger ? `Free the ${COLOR_LABELS[activePassenger] ?? activePassenger} car.` : "All passengers served.")}</p>
              {hintText && <p className="mt-1 text-xs text-emerald-200">{hintText}</p>}
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300"
            >
              Settings
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
            <span className="rounded-full bg-white/5 px-3 py-1">Moves {gameState.moveCount}</span>
            <span className="rounded-full bg-white/5 px-3 py-1">Theme {level.themeId}</span>
            <span className="rounded-full bg-white/5 px-3 py-1">Board {boardWidth}×{boardHeight}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
