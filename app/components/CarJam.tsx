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

const COLOR_PALETTES: Record<string, { body: string; trim: string; window: string; wheel: string; glow: string }> = {
  sun: { body: "#f59e0b", trim: "#fef3c7", window: "#fff7ed", wheel: "#7c2d12", glow: "rgba(251, 191, 36, 0.48)" },
  mint: { body: "#10b981", trim: "#d1fae5", window: "#ecfeff", wheel: "#064e3b", glow: "rgba(16, 185, 129, 0.42)" },
  berry: { body: "#ec4899", trim: "#fce7f3", window: "#fdf2f8", wheel: "#831843", glow: "rgba(236, 72, 153, 0.4)" },
  ocean: { body: "#0ea5e9", trim: "#e0f2fe", window: "#f0f9ff", wheel: "#0c4a6e", glow: "rgba(14, 165, 233, 0.42)" },
  gold: { body: "#fbbf24", trim: "#fef3c7", window: "#fffbeb", wheel: "#78350f", glow: "rgba(251, 191, 36, 0.42)" },
  plum: { body: "#8b5cf6", trim: "#ede9fe", window: "#f5f3ff", wheel: "#4c1d95", glow: "rgba(139, 92, 246, 0.42)" },
  coral: { body: "#fb7185", trim: "#ffe4e6", window: "#fff1f2", wheel: "#881337", glow: "rgba(251, 113, 133, 0.42)" },
};

const SKIN_LABELS: Record<string, string> = {
  hero: "Rocket",
  coupe: "Coupe",
  van: "Van",
  pickup: "Pickup",
  bus: "Bus",
  mini: "Mini",
};

const DEPART_ANIMATION_MS = 420;

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

type DepartingVehicleState = {
  vehicle: VehicleState;
  colorKey: string;
  skinKey: string;
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

function resolveSkinKey(vehicle: VehicleState, skinKey?: string) {
  if (skinKey) {
    return skinKey;
  }

  if (vehicle.role === "target") {
    return "hero";
  }

  if (vehicle.role === "truck") {
    return vehicle.orientation === "vertical" ? "bus" : "pickup";
  }

  if (vehicle.id.includes("helper") || vehicle.id.includes("slider")) {
    return "mini";
  }

  if (vehicle.id.includes("wagon")) {
    return "van";
  }

  return vehicle.orientation === "vertical" ? "pickup" : "coupe";
}

function getDepartureAnimationName(facing: VehicleState["facing"]) {
  switch (facing) {
    case "left":
      return "drive-away-left";
    case "right":
      return "drive-away-right";
    case "up":
      return "drive-away-up";
    case "down":
      return "drive-away-down";
    default:
      return "drive-away-right";
  }
}

function getVehicleStyle(vehicle: VehicleState, boardWidth: number, boardHeight: number): React.CSSProperties {
  return {
    left: `${(vehicle.x / boardWidth) * 100 + 1.2}%`,
    top: `${(vehicle.y / boardHeight) * 100 + 1.2}%`,
    width: vehicle.orientation === "horizontal" ? `calc(${(vehicle.length / boardWidth) * 100}% - 2.4%)` : `calc(${100 / boardWidth}% - 2.4%)`,
    height: vehicle.orientation === "vertical" ? `calc(${(vehicle.length / boardHeight) * 100}% - 2.4%)` : `calc(${100 / boardHeight}% - 2.4%)`,
    touchAction: "none",
  };
}

function VehicleArt({
  vehicle,
  colorKey,
  skinKey,
}: {
  vehicle: VehicleState;
  colorKey: string;
  skinKey: string;
}) {
  const palette = COLOR_PALETTES[colorKey] ?? COLOR_PALETTES.sun;
  const isHorizontal = vehicle.orientation === "horizontal";
  const viewBox = isHorizontal ? "0 0 120 56" : "0 0 56 120";
  const wheelFill = palette.wheel;

  return (
    <svg viewBox={viewBox} className="h-full w-full" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`paint-${vehicle.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.trim} />
          <stop offset="45%" stopColor={palette.body} />
          <stop offset="100%" stopColor={palette.body} />
        </linearGradient>
      </defs>

      {isHorizontal ? (
        <>
          <ellipse cx="60" cy="29" rx="58" ry="22" fill={palette.glow} />
          <rect x="7" y="10" width="106" height="34" rx="17" fill={`url(#paint-${vehicle.id})`} />
          <rect x="20" y="14" width="26" height="13" rx="6.5" fill={palette.window} opacity="0.95" />
          <rect x="49" y="14" width="22" height="13" rx="6.5" fill={palette.window} opacity="0.9" />
          <rect x="74" y="14" width="25" height="13" rx="6.5" fill={palette.window} opacity="0.86" />
          <rect x="18" y="31" width="84" height="6" rx="3" fill={palette.trim} opacity="0.75" />
          <circle cx="27" cy="43" r="7" fill={wheelFill} />
          <circle cx="93" cy="43" r="7" fill={wheelFill} />
          <circle cx="27" cy="43" r="3" fill="#e2e8f0" opacity="0.7" />
          <circle cx="93" cy="43" r="3" fill="#e2e8f0" opacity="0.7" />
          <rect x="103" y="22" width="5" height="8" rx="2.5" fill="#fef08a" />
          <rect x="12" y="22" width="4" height="8" rx="2" fill="#ffffff" opacity="0.85" />
          {skinKey === "bus" && <rect x="10" y="12" width="100" height="5" rx="2.5" fill={palette.trim} opacity="0.85" />}
          {skinKey === "pickup" && <rect x="84" y="16" width="18" height="12" rx="5" fill={palette.trim} opacity="0.6" />}
          {skinKey === "mini" && <circle cx="16" cy="17" r="5" fill={palette.trim} opacity="0.9" />}
          {vehicle.role === "target" && (
            <g>
              <circle cx="18" cy="18" r="9" fill="#fff7ed" />
              <path d="M18 10.5l2.3 4.6 5 0.7-3.6 3.5 0.8 5-4.5-2.4-4.5 2.4 0.8-5-3.6-3.5 5-0.7 2.3-4.6z" fill="#f97316" />
            </g>
          )}
        </>
      ) : (
        <>
          <ellipse cx="28" cy="60" rx="22" ry="57" fill={palette.glow} />
          <rect x="10" y="7" width="36" height="106" rx="18" fill={`url(#paint-${vehicle.id})`} />
          <rect x="15" y="18" width="26" height="17" rx="7" fill={palette.window} opacity="0.95" />
          <rect x="15" y="40" width="26" height="17" rx="7" fill={palette.window} opacity="0.9" />
          <rect x="15" y="62" width="26" height="17" rx="7" fill={palette.window} opacity="0.86" />
          <rect x="15" y="84" width="26" height="12" rx="6" fill={palette.trim} opacity="0.75" />
          <circle cx="18" cy="27" r="7" fill={wheelFill} />
          <circle cx="38" cy="27" r="7" fill={wheelFill} />
          <circle cx="18" cy="93" r="7" fill={wheelFill} />
          <circle cx="38" cy="93" r="7" fill={wheelFill} />
          <circle cx="18" cy="27" r="3" fill="#e2e8f0" opacity="0.7" />
          <circle cx="38" cy="27" r="3" fill="#e2e8f0" opacity="0.7" />
          <circle cx="18" cy="93" r="3" fill="#e2e8f0" opacity="0.7" />
          <circle cx="38" cy="93" r="3" fill="#e2e8f0" opacity="0.7" />
          <rect x="24" y="101" width="8" height="6" rx="3" fill="#fef08a" />
          <rect x="24" y="13" width="8" height="5" rx="2.5" fill="#ffffff" opacity="0.85" />
          {skinKey === "bus" && <rect x="13" y="10" width="30" height="6" rx="3" fill={palette.trim} opacity="0.85" />}
          {skinKey === "pickup" && <rect x="17" y="80" width="22" height="20" rx="8" fill={palette.trim} opacity="0.6" />}
          {skinKey === "mini" && <circle cx="28" cy="15" r="5" fill={palette.trim} opacity="0.9" />}
          {vehicle.role === "target" && (
            <g>
              <circle cx="17" cy="18" r="8" fill="#fff7ed" />
              <path d="M17 11l2 4 4.3 0.6-3.1 3 0.7 4.3-3.9-2-3.8 2 0.6-4.3-3-3 4.2-0.6 2-4z" fill="#f97316" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}

function VehicleCard({
  vehicle,
  colorKey,
  skinKey,
  isSelected,
  isBlocked,
  isDeparting,
  canEscape,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onClick,
  isShaking,
  boardWidth,
  boardHeight,
}: {
  vehicle: VehicleState;
  colorKey: string;
  skinKey: string;
  isSelected: boolean;
  isBlocked: boolean;
  isDeparting?: boolean;
  canEscape: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: () => void;
  onClick?: () => void;
  isShaking?: boolean;
  boardWidth: number;
  boardHeight: number;
}) {
  const colorClass = COLOR_CLASSES[colorKey] ?? COLOR_CLASSES.sun;

  return (
    <button
      type="button"
      aria-label={`Move ${vehicle.id}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      className={[
        "absolute overflow-hidden rounded-[1.2rem] border text-left shadow-lg transition-all duration-200 ease-out",
        "bg-gradient-to-br px-2 py-2",
        colorClass,
        isSelected ? "z-20 border-white/90 ring-4 ring-white/20" : "z-10 border-white/25",
        isShaking ? "animate-[shake_0.32s_ease-in-out]" : "",
        isDeparting ? "pointer-events-none" : "",
      ].join(" ")}
      style={{
        ...getVehicleStyle(vehicle, boardWidth, boardHeight),
        animation: isDeparting ? `${getDepartureAnimationName(vehicle.facing)} ${DEPART_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards` : undefined,
      }}
    >
      <span className="pointer-events-none relative flex h-full overflow-hidden rounded-[0.95rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.08))] p-1.5">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_34%)]" />
        <span className="absolute inset-x-1 bottom-1 top-5">
          <VehicleArt vehicle={vehicle} colorKey={colorKey} skinKey={skinKey} />
        </span>
        <span className="relative flex h-full flex-col justify-between">
          <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs">
            <span>{vehicle.role === "target" ? "Goal" : SKIN_LABELS[skinKey] ?? "Ride"}</span>
            <span className="rounded-full bg-slate-950/25 px-1.5 py-0.5 text-[9px] tracking-[0.16em] text-white/90">
              {vehicle.length}x
            </span>
          </span>
          <span className="flex items-center justify-between gap-2 text-[10px] font-semibold sm:text-xs">
            <span>{facingIcon(vehicle)} forward</span>
            <span>{isDeparting ? "Zoom" : canEscape ? "Run" : isSelected ? "Ready" : "Tap"}</span>
          </span>
        </span>
      </span>
      {isSelected && (
        <span className="pointer-events-none absolute inset-x-2 -bottom-2 h-1.5 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.5)]" />
      )}
      {isSelected && isBlocked && (
        <span className="pointer-events-none absolute -top-2 right-2 rounded-full bg-slate-950/85 px-2 py-0.5 text-[10px] font-bold text-white">
          Blocked
        </span>
      )}
    </button>
  );
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
  const [departingVehicle, setDepartingVehicle] = useState<DepartingVehicleState | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<Record<string, DragStart>>({});
  const departureTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const nextState = createGameStateFromLevel(levelId);
    setGameState(nextState);
    setSelectedVehicleId(nextState.targetVehicleId);
    setFeedback(null);
    setShakingVehicleId(null);
    setDepartingVehicle(null);
    if (departureTimeoutRef.current) {
      window.clearTimeout(departureTimeoutRef.current);
      departureTimeoutRef.current = null;
    }
  }, [levelId]);

  useEffect(() => {
    return () => {
      if (departureTimeoutRef.current) {
        window.clearTimeout(departureTimeoutRef.current);
      }
    };
  }, []);

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

  const getLevelVehicle = (vehicleId: string) => level?.vehicles.find((entry) => entry.id === vehicleId);
  const controlsLocked = Boolean(departingVehicle);
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
    if (!vehicle || gameState.hasWon || controlsLocked) {
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
    if (gameState.hasWon || controlsLocked) {
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

    const levelVehicle = getLevelVehicle(vehicle.id);
    setDepartingVehicle({
      vehicle,
      colorKey: levelVehicle?.colorKey ?? "sun",
      skinKey: resolveSkinKey(vehicle, levelVehicle?.skinKey),
    });

    departureTimeoutRef.current = window.setTimeout(() => {
      setGameState(result.state);
      setDepartingVehicle(null);
      setSelectedVehicleId(result.state.vehicles[0]?.id ?? null);
      departureTimeoutRef.current = null;

      if (result.hasWon) {
        completeVictory(result.state.moveCount);
        return;
      }

      surfaceFeedback(`${vehicle.role === "target" ? "Target car" : "Vehicle"} drove ${forwardLabel(vehicle)} and left the board.`, "success");
    }, DEPART_ANIMATION_MS);
  };

  const handleUndo = () => {
    if (controlsLocked) {
      return;
    }

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
    if (controlsLocked) {
      return;
    }

    setGameState((current) => resetGame(current));
    setSelectedVehicleId(level.targetVehicleId);
    setDepartingVehicle(null);
    surfaceFeedback("Board reset. Try a new plan!", "info");
  };

  const handleHint = () => {
    if (controlsLocked) {
      return;
    }

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
    if (controlsLocked) {
      return;
    }

    dragStartRef.current[vehicleId] = { x: event.clientX, y: event.clientY };
    setSelectedVehicleId(vehicleId);
  };

  const handlePointerUp = (vehicle: VehicleState, event: React.PointerEvent<HTMLButtonElement>) => {
    if (controlsLocked) {
      return;
    }

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
  const visibleVehicles = departingVehicle ? gameState.vehicles.filter((vehicle) => vehicle.id !== departingVehicle.vehicle.id) : gameState.vehicles;

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

              {visibleVehicles.map((vehicle) => {
                const isSelected = vehicle.id === selectedVehicleId;
                const levelVehicle = getLevelVehicle(vehicle.id);
                const colorKey = levelVehicle?.colorKey ?? "sun";
                const skinKey = resolveSkinKey(vehicle, levelVehicle?.skinKey);
                const validation = selectedVehicleId === vehicle.id ? validateMove(gameState, { vehicleId: vehicle.id, distance: 1 }) : null;
                const escapeRoute = canVehicleEscape(gameState, vehicle.id);

                return (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    colorKey={colorKey}
                    skinKey={skinKey}
                    isSelected={isSelected}
                    isBlocked={Boolean(isSelected && validation && !validation.ok)}
                    canEscape={Boolean(escapeRoute)}
                    isShaking={shakingVehicleId === vehicle.id}
                    boardWidth={level.boardWidth}
                    boardHeight={level.boardHeight}
                    onPointerDown={(event) => handlePointerDown(vehicle.id, event)}
                    onPointerUp={(event) => handlePointerUp(vehicle, event)}
                    onPointerCancel={() => {
                      delete dragStartRef.current[vehicle.id];
                    }}
                    onClick={() => handleVehicleTap(vehicle)}
                  />
                );
              })}

              {departingVehicle && (
                <VehicleCard
                  vehicle={departingVehicle.vehicle}
                  colorKey={departingVehicle.colorKey}
                  skinKey={departingVehicle.skinKey}
                  isSelected={departingVehicle.vehicle.id === selectedVehicleId}
                  isBlocked={false}
                  isDeparting
                  canEscape
                  boardWidth={level.boardWidth}
                  boardHeight={level.boardHeight}
                />
              )}
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
                disabled={controlsLocked}
                className="rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-wait disabled:opacity-60"
              >
                💡 Hint
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                disabled={!selectedVehicle || gameState.hasWon || !selectedVehicleCanAdvance || controlsLocked}
                onClick={() => selectedVehicle && attemptMove({ vehicleId: selectedVehicle.id, distance: 1 })}
                className={[
                  "rounded-2xl px-4 py-3 text-base font-bold transition",
                  !selectedVehicle || gameState.hasWon || !selectedVehicleCanAdvance || controlsLocked
                    ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
                    : "border border-white/10 bg-slate-950/70 text-white hover:border-emerald-400/40 hover:bg-slate-950",
                ].join(" ")}
              >
                {selectedVehicle ? `Move ${facingIcon(selectedVehicle)} forward` : "Select a vehicle"}
              </button>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                {controlsLocked
                  ? "A car is sliding out right now..."
                  : selectedVehicle
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
            disabled={controlsLocked}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
          >
            ↩ Undo
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={controlsLocked}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
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
