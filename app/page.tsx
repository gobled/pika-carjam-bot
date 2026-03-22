"use client";

import { useEffect, useMemo, useState } from "react";
import { CarJam } from "@/app/components/CarJam";
import { getDisplayName } from "@/app/lib/telegram";
import { useTelegramBootstrap } from "@/app/lib/useTelegramBootstrap";

type AppView =
  | "loading"
  | "home"
  | "level-select"
  | "gameplay"
  | "victory-modal"
  | "daily-reward-modal"
  | "settings"
  | "leaderboard";

const STORAGE_KEYS = {
  soundEnabled: "pikaCarJamSoundEnabled",
} as const;

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
  const { environment, session, webApp, error, isLoading } = useTelegramBootstrap();
  const [appView, setAppView] = useState<AppView>("loading");
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const savedPreference = window.localStorage.getItem(STORAGE_KEYS.soundEnabled);
    if (savedPreference !== null) {
      setSoundEnabled(savedPreference === "true");
    }
  }, []);

  useEffect(() => {
    setAppView(isLoading ? "loading" : "home");
  }, [isLoading]);

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

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEYS.soundEnabled, String(next));
      webApp?.HapticFeedback?.impactOccurred?.("soft");
      return next;
    });
  };

  if (appView === "loading") {
    return (
      <AppShell>
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-emerald-400/20 border-t-emerald-400" />
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Pika CarJam</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Starting your garage...</h1>
          <p className="mt-3 text-sm text-slate-300">
            We&apos;re preparing the app shell and checking whether you launched from Telegram or a regular browser.
          </p>
        </div>
      </AppShell>
    );
  }

  if (appView === "gameplay") {
    return (
      <CarJam
        levelLabel="Level 1 · Traffic Warm-up"
        session={session}
        soundEnabled={soundEnabled}
        onBack={() => setAppView("home")}
        onOpenSettings={() => setAppView("settings")}
        onVictory={() => setAppView("victory-modal")}
      />
    );
  }

  return (
    <>
      <AppShell>
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Pika CarJam MVP</p>
              <h1 className="mt-3 text-3xl font-bold text-white">{displayName}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {environment === "telegram"
                  ? "Your Telegram mini app shell is ready for puzzle screens."
                  : "Running in browser fallback mode for local development."}
                {username ? ` ${username}` : ""}
              </p>
            </div>
            <StatusPill tone={environment === "telegram" ? "info" : "default"}>
              {environment === "telegram" ? "Telegram" : "Browser"}
            </StatusPill>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <StatusPill>{session.startParam ? `start: ${session.startParam}` : "no start param"}</StatusPill>
            <StatusPill>{session.launchSource ?? "unknown source"}</StatusPill>
            <StatusPill>{soundEnabled ? "sound on" : "sound off"}</StatusPill>
          </div>

          {(error || hasSessionWarning) && (
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-100">Session fallback active</p>
                  <p className="mt-1 text-sm text-amber-50/90">
                    {error ?? "Telegram opened the app without user details. We&apos;ll continue with a safe guest shell until session data is available."}
                  </p>
                </div>
                <StatusPill tone="warning">Guest mode</StatusPill>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Top-level app states</p>
                <p className="mt-1 text-sm text-slate-300">
                  Phase 1 wires every planned MVP screen into a stable shell so later gameplay work can focus on the puzzle engine.
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
                onClick={() => setAppView("level-select")}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-400/40 hover:bg-slate-950"
              >
                <p className="font-semibold text-white">Level select</p>
                <p className="mt-1 text-slate-400">Choose the first puzzle pack.</p>
              </button>
              <button
                type="button"
                onClick={() => setAppView("leaderboard")}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-400/40 hover:bg-slate-950"
              >
                <p className="font-semibold text-white">Leaderboard</p>
                <p className="mt-1 text-slate-400">Preview the upcoming social screen.</p>
              </button>
              <button
                type="button"
                onClick={() => setAppView("settings")}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-400/40 hover:bg-slate-950"
              >
                <p className="font-semibold text-white">Settings</p>
                <p className="mt-1 text-slate-400">Check safe toggles and session info.</p>
              </button>
              <button
                type="button"
                onClick={() => setAppView("daily-reward-modal")}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-400/40 hover:bg-slate-950"
              >
                <p className="font-semibold text-white">Daily reward</p>
                <p className="mt-1 text-slate-400">Open the modal state for rewards.</p>
              </button>
            </div>
          </div>

          {appView === "home" && (
            <div className="mt-6 rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
              <p className="text-sm font-semibold text-emerald-100">Ready to start</p>
              <p className="mt-1 text-sm text-emerald-50/90">
                The home screen is now driven by a stable session model instead of Telegram calls being embedded directly in the page UI.
              </p>
              <button
                type="button"
                onClick={() => setAppView("level-select")}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-base font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Start puzzle flow
              </button>
            </div>
          )}

          {appView === "level-select" && (
            <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Level select</p>
                  <p className="mt-1 text-sm text-slate-400">A simple launch pack placeholder keeps navigation stable while the puzzle engine lands.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAppView("home")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Back
                </button>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Tutorial pack</p>
                <h2 className="mt-2 text-xl font-bold text-white">Traffic Warm-up</h2>
                <p className="mt-2 text-sm text-slate-300">One starter puzzle slot is enough to validate the shell in Telegram and local browsers.</p>
                <button
                  type="button"
                  onClick={() => {
                    webApp?.HapticFeedback?.impactOccurred?.("medium");
                    setAppView("gameplay");
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-base font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Play level 1
                </button>
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
                  <p className="mt-1 text-sm text-slate-400">This placeholder keeps the route-less MVP flow visible without mixing in non-game referral features.</p>
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
                  [displayName, "You · shell ready"],
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

      {appView === "victory-modal" && (
        <ModalCard
          title="Puzzle cleared!"
          description="The victory modal state is wired up and ready for real move counts, stars, and next-level actions in later phases."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
              Placeholder result: 3 stars, 12 moves, 1 happy escape car.
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
                onClick={() => setAppView("gameplay")}
                className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Next level
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
