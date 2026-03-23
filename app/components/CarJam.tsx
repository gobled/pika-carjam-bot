"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createGameStateFromLevel, getLevelById, getNextLevelMetadata, getStarRating } from "@/app/lib/levels";
import { canVehicleEscape, escapeVehicle, getHintSuggestion, moveVehicle, resetGame, undoMove, validateMove } from "@/app/lib/game";
import type { MoveInput, VehicleState } from "@/app/lib/game";
import type { TelegramSession } from "@/app/lib/telegram";

const COLOR_CLASSES: Record<string, string> = {
  sun: "from-amber-300 to-orange-400 text-orange-950",
  mint: "from-emerald-300 to-teal-400 text-emerald-950",
  berry: "from-fuchsia-300 to-pink-400 text-pink-950",
  ocean: "from-sky-300 to-cyan-400 text-sky-950",
  gold: "from-yellow-200 to-amber-300 text-amber-950",
  plum: "from-violet-300 to-purple-400 text-purple-950",
  coral: "from-rose-300 to-orange-300 text-rose-950",
};

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

function facingIcon(vehicle: VehicleState) {
  switch (vehicle.facing) {
    case "left":
      return "←";
    case "right":
      return "→";
    case "up":
      return "↑";
    case "down":
      return "↓";
    default:
      return "•";
  }
}

function forwardLabel(vehicle: VehicleState) {
  switch (vehicle.facing) {
    case "left":
      return "left";
    case "right":
      return "right";
    case "up":
      return "up";
    case "down":
      return "down";
    default:
      return "forward";
  }
}

export function CarJam({
  levelId,
  session,
  soundEnabled,
  onBack,
  onOpenSettings,
  onVictory,
}: CarJamProps) {
  const level = useMemo(() => getLevelById(levelId), [levelId]);
  const [gameState, setGameState] = useState(() => createGameStateFromLevel(levelId));
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"info" | "warning" | "success">("info");
  const [shakingVehicleId, setShakingVehicleId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<Record<string, DragStart>>({});

  useEffect(() => {
    const nextState = createGameStateFromLevel(levelId);
    setGameState(nextState);
    setSelectedVehicleId(nextState.targetVehicleId);
    setFeedback(null);
    setShakingVehicleId(null);
  }, [levelId]);

  useEffect(() => {
    if (!selectedVehicleId && gameState.vehicles.length) {
      setSelectedVehicleId(gameState.targetVehicleId);
    }
  }, [gameState.targetVehicleId, gameState.vehicles.length, selectedVehicleId]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFeedback(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    if (!shakingVehicleId) {
      return;
    }

    const timeoutId = window.setTimeout(() => setShakingVehicleId(null), 340);
    return () => window.clearTimeout(timeoutId);
  }, [shakingVehicleId]);

  const selectedVehicle = gameState.vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;

  const surfaceFeedback = (message: string, tone: "info" | "warning" | "success", vehicleId?: string | null) => {
    setFeedback(message);
    setFeedbackTone(tone);
    if (vehicleId) {
      setShakingVehicleId(vehicleId);
    }
  };

  if (!level) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-[2rem] border border-amber-400/30 bg-slate-900/90 p-6 text-center shadow-2xl shadow-black/40">
          <p className="text-sm font-semibold text-amber-200">Level missing</p>
          <p className="mt-2 text-sm text-slate-300">We couldn&apos;t load that puzzle. Head back to the map and pick another one.</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Back to map
          </button>
        </div>
      </div>
    );
  }

  const nextLevel = getNextLevelMetadata(level.levelId);
  const completionPercent = Math.round((((nextLevel?.currentIndex ?? 0) + 1) / (nextLevel?.totalLevels ?? 1)) * 100);

  const getExitStyle = () => {
    switch (level.exit.side) {
      case "right":
        return {
          right: "-2.5%",
          top: `${(level.exit.row / level.boardHeight) * 100 + 3}%`,
          width: "5%",
          height: `${94 / level.boardHeight}%`,
        };
      case "left":
        return {
          left: "-2.5%",
          top: `${(level.exit.row / level.boardHeight) * 100 + 3}%`,
          width: "5%",
          height: `${94 / level.boardHeight}%`,
        };
      case "top":
        return {
          top: "-2.5%",
          left: `${(level.exit.column / level.boardWidth) * 100 + 3}%`,
          height: "5%",
          width: `${94 / level.boardWidth}%`,
        };
      case "bottom":
        return {
          bottom: "-2.5%",
          left: `${(level.exit.column / level.boardWidth) * 100 + 3}%`,
          height: "5%",
          width: `${94 / level.boardWidth}%`,
        };
      default:
        return {};
    }
  };

  const completeVictory = (moveCount: number) => {
    const starsEarned = getStarRating(level, moveCount);
    surfaceFeedback("Yay! The target car escaped.", "success");
    onVictory({
      levelId: level.levelId,
      moveCount,
      starsEarned,
      nextLevelId: nextLevel?.nextLevelId ?? null,
    });
  };

  const attemptMove = (move: MoveInput) => {
    const vehicle = gameState.vehicles.find((entry) => entry.id === move.vehicleId);
    if (!vehicle || gameState.hasWon) {
      return;
    }

    setSelectedVehicleId(vehicle.id);

    const result = moveVehicle(gameState, move);
    if (!result.ok) {
      surfaceFeedback(result.message, "warning", result.blockedByVehicleId ?? vehicle.id);
      return;
    }

    setGameState(result.state);
    setFeedback(null);

    if (result.hasWon) {
      completeVictory(result.state.moveCount);
      return;
    }

    surfaceFeedback(
      `${vehicle.role === "target" ? "Target car" : "Vehicle"} moved ${Math.abs(move.distance)} ${Math.abs(move.distance) === 1 ? "step" : "steps"} ${forwardLabel(vehicle)}.`,
      "info",
    );
  };

  const handleVehicleTap = (vehicle: VehicleState) => {
    if (gameState.hasWon) {
      return;
    }

    const escapeRoute = canVehicleEscape(gameState, vehicle.id);
    setSelectedVehicleId(vehicle.id);

    if (!escapeRoute) {
      surfaceFeedback(`Facing ${forwardLabel(vehicle)}. Clear the lane and tap again to send it off.`, "info", vehicle.id);
      return;
    }

    const result = escapeVehicle(gameState, vehicle.id);
    if (!result.ok) {
      surfaceFeedback(result.message, "warning", vehicle.id);
      return;
    }

    setGameState(result.state);
    setSelectedVehicleId(result.state.vehicles[0]?.id ?? null);

    if (result.hasWon) {
      completeVictory(result.state.moveCount);
      return;
    }

    surfaceFeedback(`${vehicle.role === "target" ? "Target car" : "Vehicle"} drove ${forwardLabel(vehicle)} and left the board.`, "success");
  };

  const handleUndo = () => {
    const result = undoMove(gameState);
    if (!result.ok) {
      surfaceFeedback(result.message, "warning");
      return;
    }

    setGameState(result.state);
    setSelectedVehicleId(result.undoneMove.vehicleId);
    surfaceFeedback("Undid the last move.", "info");
  };

  const handleReset = () => {
    setGameState((current) => resetGame(current));
    setSelectedVehicleId(level.targetVehicleId);
    surfaceFeedback("Board reset. Try a new plan!", "info");
  };

  const handleHint = () => {
    const hint = getHintSuggestion(gameState);
    if (hint) {
      surfaceFeedback(hint.explanation, "info", hint.vehicleId);
      setSelectedVehicleId(hint.vehicleId);
      return;
    }

    const recommendedMove = level.hintMetadata.recommendedFirstMove;
    if (recommendedMove) {
      setSelectedVehicleId(recommendedMove.vehicleId);
      surfaceFeedback(
        `${level.hintMetadata.summary} Try moving ${recommendedMove.vehicleId} ${Math.abs(recommendedMove.distance)} step${Math.abs(recommendedMove.distance) === 1 ? "" : "s"}.`,
        "info",
        recommendedMove.vehicleId,
      );
      return;
    }

    surfaceFeedback(level.hintMetadata.summary, "info");
  };

  const handlePointerDown = (vehicleId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    dragStartRef.current[vehicleId] = { x: event.clientX, y: event.clientY };
    setSelectedVehicleId(vehicleId);
  };

  const handlePointerUp = (vehicle: VehicleState, event: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current[vehicle.id];
    setSelectedVehicleId(vehicle.id);

    if (!start || !boardRef.current) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const boardRect = boardRef.current.getBoundingClientRect();
    const cellSize = Math.min(boardRect.width / level.boardWidth, boardRect.height / level.boardHeight);
    const primaryDelta = vehicle.orientation === "horizontal" ? deltaX : deltaY;
    const crossDelta = vehicle.orientation === "horizontal" ? deltaY : deltaX;

    delete dragStartRef.current[vehicle.id];

    if (Math.abs(primaryDelta) < cellSize * 0.35 && Math.abs(crossDelta) < cellSize * 0.35) {
      return;
    }

    if (Math.abs(crossDelta) > Math.abs(primaryDelta)) {
      surfaceFeedback(`This ride only drives forward ${forwardLabel(vehicle)}.`, "warning", vehicle.id);
      return;
    }

    const directionalDelta = vehicle.facing === "left" || vehicle.facing === "up" ? -primaryDelta : primaryDelta;
    const rawDistance = Math.round(directionalDelta / cellSize);
    const distance = Math.max(0, Math.min(Math.max(level.boardWidth, level.boardHeight), rawDistance));

    if (distance === 0) {
      return;
    }

    attemptMove({ vehicleId: vehicle.id, distance });
  };

  const exitStyle = getExitStyle();
  const starPreview = gameState.moveCount === 0 ? 3 : getStarRating(level, gameState.moveCount);
  const selectedVehicleCanAdvance = selectedVehicle ? validateMove(gameState, { vehicleId: selectedVehicle.id, distance: 1 }).ok : false;
  const selectedVehicleCanEscape = selectedVehicle ? canVehicleEscape(gameState, selectedVehicle.id) !== null : false;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.24),_transparent_40%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#111827_100%)] px-4 py-5 text-slate-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4">
        <header className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-xl shadow-black/30 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              ← Map
            </button>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">Playable slice</p>
              <h1 className="text-lg font-bold text-white">{level.levelId.replace("tutorial-", "Level ")}</h1>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              ⚙️
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs sm:text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-slate-400">Moves</p>
              <p className="mt-1 text-lg font-bold text-white">{gameState.moveCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-slate-400">Stars</p>
              <p className="mt-1 text-lg font-bold text-white">{starPreview > 0 ? "⭐".repeat(starPreview) : "—"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-slate-400">Mode</p>
              <p className="mt-1 text-sm font-semibold text-white">{soundEnabled ? "Sound on" : "Quiet"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-slate-400">App</p>
              <p className="mt-1 text-sm font-semibold text-white">{session.environment === "telegram" ? "Telegram" : "Browser"}</p>
            </div>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Garage lane</p>
              <p className="mt-1 text-sm text-slate-300">Swipe a vehicle forward in its lane, or tap a free vehicle to let it drive away.</p>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              {completionPercent}% through pack
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[24rem] rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,#18212f_0%,#0f172a_100%)] p-3 shadow-inner shadow-black/40">
            <div
              ref={boardRef}
              className="relative h-full w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950/85"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)`,
                backgroundSize: `${100 / level.boardWidth}% ${100 / level.boardHeight}%`,
              }}
            >
              <div
                className="absolute rounded-full bg-emerald-400/80 shadow-[0_0_26px_rgba(74,222,128,0.45)]"
                style={exitStyle}
              />

              {gameState.vehicles.map((vehicle) => {
                const isSelected = vehicle.id === selectedVehicleId;
                const colorClass = COLOR_CLASSES[level.vehicles.find((entry) => entry.id === vehicle.id)?.colorKey ?? "sun"] ?? COLOR_CLASSES.sun;
                const validation = selectedVehicleId === vehicle.id ? validateMove(gameState, { vehicleId: vehicle.id, distance: 1 }) : null;
                const escapeRoute = canVehicleEscape(gameState, vehicle.id);

                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    aria-label={`Move ${vehicle.id}`}
                    onPointerDown={(event) => handlePointerDown(vehicle.id, event)}
                    onPointerUp={(event) => handlePointerUp(vehicle, event)}
                    onPointerCancel={() => {
                      delete dragStartRef.current[vehicle.id];
                    }}
                    onClick={() => handleVehicleTap(vehicle)}
                    className={[
                      "absolute rounded-[1.2rem] border text-left shadow-lg transition-all duration-200 ease-out",
                      "bg-gradient-to-br px-2 py-2",
                      colorClass,
                      isSelected ? "z-20 border-white/90 ring-4 ring-white/20" : "z-10 border-white/25",
                      shakingVehicleId === vehicle.id ? "animate-[shake_0.32s_ease-in-out]" : "",
                    ].join(" ")}
                    style={{
                      left: `${(vehicle.x / level.boardWidth) * 100 + 1.2}%`,
                      top: `${(vehicle.y / level.boardHeight) * 100 + 1.2}%`,
                      width: vehicle.orientation === "horizontal" ? `calc(${(vehicle.length / level.boardWidth) * 100}% - 2.4%)` : `calc(${100 / level.boardWidth}% - 2.4%)`,
                      height: vehicle.orientation === "vertical" ? `calc(${(vehicle.length / level.boardHeight) * 100}% - 2.4%)` : `calc(${100 / level.boardHeight}% - 2.4%)`,
                      touchAction: "none",
                    }}
                  >
                    <span className="pointer-events-none flex h-full flex-col justify-between rounded-[0.95rem] bg-white/10 p-1.5">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs">
                        {vehicle.role === "target" ? "Goal" : vehicle.role}
                      </span>
                      <span className="flex items-center justify-between text-[10px] font-semibold sm:text-xs">
                        <span>{facingIcon(vehicle)} forward</span>
                        <span>{escapeRoute ? "Run" : isSelected ? "Ready" : "Tap"}</span>
                      </span>
                    </span>
                    {isSelected && (
                      <span className="pointer-events-none absolute inset-x-2 -bottom-2 h-1.5 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.5)]" />
                    )}
                    {isSelected && validation && !validation.ok && (
                      <span className="pointer-events-none absolute -top-2 right-2 rounded-full bg-slate-950/85 px-2 py-0.5 text-[10px] font-bold text-white">
                        Blocked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{selectedVehicle ? (selectedVehicle.role === "target" ? "Target car selected" : `${selectedVehicle.id} selected`) : "Pick a vehicle"}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {selectedVehicle
                    ? `This one only moves forward ${forwardLabel(selectedVehicle)}.`
                    : "Tap any vehicle to start moving it."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleHint}
                className="rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20"
              >
                💡 Hint
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                disabled={!selectedVehicle || gameState.hasWon || !selectedVehicleCanAdvance}
                onClick={() => selectedVehicle && attemptMove({ vehicleId: selectedVehicle.id, distance: 1 })}
                className={[
                  "rounded-2xl px-4 py-3 text-base font-bold transition",
                  !selectedVehicle || gameState.hasWon || !selectedVehicleCanAdvance
                    ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
                    : "border border-white/10 bg-slate-950/70 text-white hover:border-emerald-400/40 hover:bg-slate-950",
                ].join(" ")}
              >
                {selectedVehicle ? `Move ${facingIcon(selectedVehicle)} forward` : "Select a vehicle"}
              </button>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                {selectedVehicle
                  ? selectedVehicleCanEscape
                    ? "Lane clear: tap the vehicle to let it drive away."
                    : "Blocked ahead: move something else first."
                  : "Select a vehicle to see its lane status."}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleUndo}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            ↩ Undo
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            ↻ Restart
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            🏠 Home
          </button>
        </div>

        <div
          className={[
            "rounded-[1.5rem] border px-4 py-3 text-sm shadow-lg transition",
            feedbackTone === "warning"
              ? "border-amber-400/30 bg-amber-500/10 text-amber-50"
              : feedbackTone === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-50"
                : "border-sky-400/30 bg-sky-500/10 text-sky-50",
          ].join(" ")}
        >
          <p className="font-semibold">
            {feedbackTone === "warning" ? "Try again" : feedbackTone === "success" ? "Great job" : "Driver tip"}
          </p>
          <p className="mt-1 text-sm/6 text-current/90">{feedback ?? level.hintMetadata.summary}</p>
        </div>
      </div>
    </div>
  );
}
