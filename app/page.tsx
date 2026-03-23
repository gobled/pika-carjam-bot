"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CarJam } from "@/app/components/CarJam";
import { getLevelById, getLevelSummaries } from "@/app/lib/levels";
import { getDisplayName } from "@/app/lib/telegram";
import { useTelegramBootstrap } from "@/app/lib/useTelegramBootstrap";

type AppView =
  | "home"
  | "level-select"
  | "gameplay"
  | "victory-modal"
  | "daily-reward-modal"
  | "settings"
  | "leaderboard";

type VictoryState = {
  levelId: string;
  moveCount: number;
  starsEarned: number;
  nextLevelId: string | null;
};

const STORAGE_KEYS = {
  soundEnabled: "pikaCarJamSoundEnabled",
} as const;

const LEVEL_SUMMARIES = getLevelSummaries();

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.16),_transparent_36%),linear-gradient(180deg,#020617_0%,#111827_48%,#0f172a_100%)] px-4 py-5 text-slate-100 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-md flex-col justify-center">
        {children}
      </div>
    </div>
  );
}

function StatusPill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warning" | "info" }) {
  const toneClasses = {
    default: "border-white/10 bg-white/5 text-slate-200",
    warning: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    info: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

function ModalCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-950/75 px-4 py-6 sm:items-center">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/40">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { environment, session, webApp, error, isLoading, fatalError, retry } = useTelegramBootstrap();
  const [appView, setAppView] = useState<AppView>("home");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedLevelId, setSelectedLevelId] = useState(LEVEL_SUMMARIES[0]?.levelId ?? "tutorial-01");
  const [victoryState, setVictoryState] = useState<VictoryState | null>(null);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    const savedPreference = window.localStorage.getItem(STORAGE_KEYS.soundEnabled);
    if (savedPreference !== null) {
      setSoundEnabled(savedPreference === "true");
    }
  }, []);

  useEffect(() => {
    if (fatalError || isLoading || hasAutoOpenedRef.current) {
      return;
    }

    hasAutoOpenedRef.current = true;
    setAppView("gameplay");
  }, [fatalError, isLoading]);

  useEffect(() => {
    const preventPullToRefresh = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        return;
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop <= 0) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventPullToRefresh, { passive: false });
    return () => document.removeEventListener("touchmove", preventPullToRefresh);
  }, []);

  const displayName = useMemo(() => getDisplayName(session), [session]);
  const username = session.user.username ? `@${session.user.username}` : null;
  const hasSessionWarning = environment === "telegram" && !session.hasTelegramUser;
  const selectedLevel = getLevelById(selectedLevelId);

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEYS.soundEnabled, String(next));
      webApp?.HapticFeedback?.impactOccurred?.("soft");
      return next;
    });
  };

  const openLevel = (levelId: string) => {
    setSelectedLevelId(levelId);
    setVictoryState(null);
    webApp?.HapticFeedback?.impactOccurred?.("medium");
    setAppView("gameplay");
  };

  const openSelectedLevel = () => {
    openLevel(selectedLevelId);
  };

  if (fatalError) {
    return (
      <AppShell>
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Pika CarJam</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Garage failed to open</h1>
          <p className="mt-3 text-sm text-slate-300">{fatalError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-base font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  if (appView === "gameplay") {
    return (
      <CarJam
        levelId={selectedLevelId}
        session={session}
        soundEnabled={soundEnabled}
        onBack={() => setAppView("level-select")}
        onOpenSettings={() => setAppView("settings")}
        onVictory={(payload) => {
          setVictoryState(payload);
          setAppView("victory-modal");
        }}
      />
    );
  }

  return (
    <>
      <AppShell>
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Pika CarJam Color</p>
              <h1 className="mt-3 text-3xl font-bold text-white">{displayName}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {environment === "telegram"
                  ? "Telegram perks load in the background while your first puzzle is already ready to play."
                  : "Play immediately in any browser, with Telegram enhancements layered on when available."}
                {username ? ` ${username}` : ""}
              </p>
            </div>
            <StatusPill tone={environment === "telegram" ? "info" : "default"}>
              {environment === "telegram" ? "Telegram" : "Browser"}
            </StatusPill>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <StatusPill>{session.startParam ? `start: ${session.startParam}` : "instant play"}</StatusPill>
            <StatusPill>{session.launchSource ?? "unknown source"}</StatusPill>
            <StatusPill>{soundEnabled ? "sound on" : "sound off"}</StatusPill>
            {isLoading && <StatusPill tone="info">Preparing Telegram extras…</StatusPill>}
          </div>

          {(error || hasSessionWarning) && (
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-100">Telegram extras are optional</p>
                  <p className="mt-1 text-sm text-amber-50/90">
                    {error ?? "Telegram opened the app without user details. Gameplay still works now, and profile-powered extras can attach later."}
                  </p>
                </div>
                <StatusPill tone="warning">Guest mode</StatusPill>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
            <p className="text-sm font-semibold text-emerald-100">Jump straight into the puzzle loop</p>
            <h2 className="mt-2 text-3xl font-black text-white">Start clearing cars in one tap.</h2>
            <p className="mt-2 text-sm text-emerald-50/90">
              Slide vehicles, open pickup lanes, and match the front passenger queue before the dock fills up.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <button
                type="button"
                onClick={openSelectedLevel}
                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                {isLoading ? "Play now" : `Start ${selectedLevel?.levelId.replace("tutorial-", "Level ") ?? "Level 1"}`}
              </button>
              <button
                type="button"
                onClick={() => setAppView("level-select")}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Level map
              </button>
            </div>
            <p className="mt-3 text-xs text-emerald-100/80">
              {isLoading
                ? "The board opens automatically as soon as initialization finishes, so you never get stuck on a passive status screen."
                : "Initialization is complete, and the board will open automatically if you stay on this screen."}
            </p>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Vertical slice ready</p>
                <p className="mt-1 text-sm text-slate-300">
                  Pick a puzzle, slide cars along their lanes, open pickup columns for matching colors, and clear the passenger queue.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-950"
              >
                {soundEnabled ? "🔊 On" : "🔇 Off"}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left text-sm">
              <button
                type="button"
                onClick={openSelectedLevel}
                className="rounded-2xl border border-emerald-400/30 bg-slate-950/60 p-4 transition hover:border-emerald-400/50 hover:bg-slate-950"
              >
                <p className="font-semibold text-white">Continue puzzle</p>
                <p className="mt-1 text-slate-400">Jump into {selectedLevel?.levelId.replace("tutorial-", "Level ") ?? "Level 1"} instantly.</p>
              </button>
              <button
                type="button"
                onClick={() => setAppView("settings")}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-400/40 hover:bg-slate-950"
              >
                <p className="font-semibold text-white">Settings</p>
                <p className="mt-1 text-slate-400">Check safe toggles and Telegram session info.</p>
              </button>
              <button
                type="button"
                onClick={() => setAppView("leaderboard")}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-400/40 hover:bg-slate-950"
              >
                <p className="font-semibold text-white">Leaderboard</p>
                <p className="mt-1 text-slate-400">Keep the social shell visible for later phases.</p>
              </button>
              <button
                type="button"
                onClick={() => setAppView("daily-reward-modal")}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-400/40 hover:bg-slate-950"
              >
                <p className="font-semibold text-white">Daily reward</p>
                <p className="mt-1 text-slate-400">Preview the next layer without blocking the core puzzle flow.</p>
              </button>
            </div>
          </div>

          {appView === "level-select" && (
            <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Level map</p>
                  <p className="mt-1 text-sm text-slate-400">All launch-pack puzzles are available here for the vertical slice.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAppView("home")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Back
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {LEVEL_SUMMARIES.map((level, index) => (
                  <button
                    key={level.levelId}
                    type="button"
                    onClick={() => openLevel(level.levelId)}
                    className={[
                      "rounded-[1.5rem] border p-4 text-left transition",
                      level.levelId === selectedLevelId
                        ? "border-emerald-400/50 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 hover:border-emerald-400/30 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">Level {index + 1}</span>
                      <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                        {level.themeId.replace(/-/g, " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-300">{level.vehicleCount} vehicles · {level.boardWidth}×{level.boardHeight} board</p>
                    <p className="mt-3 text-sm text-slate-400">
                      3⭐ in {level.starThresholds.threeStars} moves · 1⭐ in {level.starThresholds.oneStar}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {appView === "settings" && (
            <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Settings</p>
                  <p className="mt-1 text-sm text-slate-400">Progressive enhancement stays optional so browser fallback remains usable.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAppView("home")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Back
                </button>
              </div>
              <dl className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt>Sound</dt>
                  <dd>{soundEnabled ? "Enabled" : "Disabled"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt>Telegram user</dt>
                  <dd>{session.hasTelegramUser ? "Available" : "Fallback guest"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt>Selected level</dt>
                  <dd>{selectedLevel?.levelId ?? "Unknown"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt>Init data</dt>
                  <dd>{session.rawInitData ? "Present" : "Unavailable"}</dd>
                </div>
              </dl>
            </section>
          )}

          {appView === "leaderboard" && (
            <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Leaderboard</p>
                  <p className="mt-1 text-sm text-slate-400">Still a placeholder, but now framed around the real level loop instead of the old fake board.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAppView("home")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Back
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {[
                  ["Pika Pilot", "12 stars"],
                  [displayName, victoryState ? `${victoryState.starsEarned} stars this run` : "You · ready to play"],
                  ["Turbo Turtle", "9 stars"],
                ].map(([name, score], index) => (
                  <div key={name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span>{index + 1}. {name}</span>
                    <span>{score}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </AppShell>

      {appView === "victory-modal" && victoryState && (
        <ModalCard
          title="Puzzle cleared!"
          description={`You freed ${victoryState.levelId.replace("tutorial-", "Level ")} in ${victoryState.moveCount} moves.`}
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
              Stars earned: {victoryState.starsEarned > 0 ? "⭐".repeat(victoryState.starsEarned) : "Keep practicing for stars!"}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAppView("level-select")}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Level map
              </button>
              <button
                type="button"
                onClick={() => {
                  if (victoryState.nextLevelId) {
                    openLevel(victoryState.nextLevelId);
                    return;
                  }

                  setAppView("level-select");
                }}
                className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                {victoryState.nextLevelId ? "Next level" : "More puzzles"}
              </button>
            </div>
          </div>
        </ModalCard>
      )}

      {appView === "daily-reward-modal" && (
        <ModalCard
          title="Daily reward"
          description="This state is ready for future persistence hooks and reward APIs, while still being safe to preview in local development."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-50">
              Come back tomorrow to collect your next booster crate.
            </div>
            <button
              type="button"
              onClick={() => setAppView("home")}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              Back to home
            </button>
          </div>
        </ModalCard>
      )}
    </>
  );
}
