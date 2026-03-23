"use client";

import type { AttemptStatus, LossReason, MoveFeedback } from "@/app/lib/game/types";

type GameOverlayProps = {
  feedback: MoveFeedback | null;
  status: AttemptStatus;
  lossReason: LossReason;
  onRestart: () => void;
  onExit: () => void;
};

const TONE_STYLES = {
  neutral: "border-white/10 bg-black/20 text-slate-200",
  info: "border-sky-400/20 bg-sky-500/10 text-sky-100",
  success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  danger: "border-rose-400/20 bg-rose-500/10 text-rose-100",
} as const;

function getStatusFallback(status: AttemptStatus, lossReason: LossReason): MoveFeedback | null {
  if (status === "won") {
    return {
      code: "win",
      tone: "success",
      title: "All passengers boarded",
      message: "The queue is empty and gameplay is locked. Restart to replay the same fixed opening layout.",
    };
  }

  if (status === "lost") {
    return {
      code: lossReason === "dock-full" ? "dock-full-loss" : "no-legal-move-loss",
      tone: lossReason === "dock-full" ? "danger" : "warning",
      title: lossReason === "dock-full" ? "Dock is full" : "No legal move left",
      message:
        lossReason === "dock-full"
          ? "A non-matching clear vehicle had nowhere to wait."
          : "No parking or dock interaction can advance the queue.",
    };
  }

  return null;
}

function getFeedbackEyebrow(content: MoveFeedback) {
  switch (content.code) {
    case "blocked-vehicle":
      return "Blocked move";
    case "parking-resolved":
      return "Successful exit";
    case "vehicle-docked":
      return "Dock update";
    case "dock-resolved":
      return "Dock resolution";
    case "invalid-dock-tap":
      return "Dock tap";
    case "dock-full-loss":
      return "Dock capacity";
    case "attempt-ready":
      return "Level ready";
    case "attempt-reset":
      return "Restarted";
    default:
      return "Game status";
  }
}

function getFeedbackHint(content: MoveFeedback) {
  switch (content.code) {
    case "blocked-vehicle":
      return "Find a vehicle with an open lane before trying to advance the queue.";
    case "parking-resolved":
      return "The next passenger is now at the front of the queue.";
    case "vehicle-docked":
      return "That move was legal, but the vehicle now waits for a later matching tap.";
    case "dock-resolved":
      return "Docked vehicles still require a tap once they become the active match.";
    case "invalid-dock-tap":
      return "A docked vehicle can only board when its color matches the passenger at the front of the queue.";
    case "dock-full-loss":
      return "A clear non-matching vehicle needs an open dock slot. If all three slots are occupied, the run ends immediately.";
    case "attempt-ready":
      return "Start by matching the highlighted passenger with a clear vehicle.";
    default:
      return null;
  }
}

export function GameOverlay({ feedback, status, lossReason, onRestart, onExit }: GameOverlayProps) {
  const outcomeContent = status === "playing" ? null : getStatusFallback(status, lossReason);
  const content = outcomeContent ?? feedback;

  if (!content) {
    return null;
  }

  const hint = getFeedbackHint(content);

  if (outcomeContent) {
    return (
      <section
        className={`rounded-[28px] border p-4 shadow-xl sm:p-5 ${TONE_STYLES[outcomeContent.tone]}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.24em] opacity-80">
            {status === "won" ? "Win state" : "Loss state"}
          </p>
          <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] opacity-80">
            {status}
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-semibold">{outcomeContent.title}</h2>
        <p className="mt-2 text-sm opacity-90">{outcomeContent.message}</p>

        {lossReason ? (
          <p className="mt-3 text-xs uppercase tracking-[0.2em] opacity-75">
            {lossReason === "dock-full" ? "Loss reason: dock full" : "Loss reason: no legal move"}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Restart level
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-current/20 bg-black/15 px-5 py-2.5 text-sm font-semibold transition hover:bg-black/25"
          >
            Exit to home
          </button>
        </div>

        {hint ? <p className="mt-4 text-xs opacity-80">{hint}</p> : null}
      </section>
    );
  }

  return (
    <section
      className={`rounded-[28px] border p-4 ${TONE_STYLES[content.tone]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] opacity-80">{getFeedbackEyebrow(content)}</p>
        <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] opacity-80">
          {content.tone}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-semibold">{content.title}</h2>
      <p className="mt-1 text-sm opacity-90">{content.message}</p>
      {hint ? <p className="mt-3 text-xs opacity-80">{hint}</p> : null}
    </section>
  );
}
