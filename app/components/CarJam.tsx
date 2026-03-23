"use client";

import type { TelegramSession } from "@/app/lib/telegram";

type CarJamProps = {
  levelLabel: string;
  session: TelegramSession;
  soundEnabled: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onVictory: () => void;
};

export function CarJam({
  levelLabel,
  session,
  soundEnabled,
  onBack,
  onOpenSettings,
  onVictory,
}: CarJamProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.24),_transparent_40%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#111827_100%)] px-4 py-5 text-slate-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4">
        <header className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/70 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            ← Home
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Gameplay</p>
            <h1 className="text-lg font-bold text-white">{levelLabel}</h1>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            ⚙️
          </button>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-5 flex items-center justify-between text-sm text-slate-300">
            <span>{session.environment === "telegram" ? "Telegram session" : "Browser preview"}</span>
            <span>{soundEnabled ? "Sound on" : "Sound off"}</span>
          </div>

          <div className="grid aspect-square grid-cols-6 gap-2 rounded-[1.5rem] bg-slate-950/80 p-3">
            {Array.from({ length: 36 }, (_, index) => {
              const isTargetLane = index >= 14 && index <= 17;
              const isHeroCar = index === 14 || index === 15;
              const isBlockingTruck = index === 9 || index === 15 || index === 21;

              return (
                <div
                  key={index}
                  className={[
                    "rounded-xl border border-white/5",
                    isHeroCar
                      ? "bg-amber-400/95 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
                      : isBlockingTruck
                        ? "bg-sky-400/80"
                        : isTargetLane
                          ? "bg-emerald-500/10"
                          : "bg-white/5",
                  ].join(" ")}
                />
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">
            <p className="font-semibold text-emerald-200">Phase 1 shell</p>
            <p className="mt-1 text-emerald-50/90">
              The board area is now isolated from Telegram startup so the deterministic puzzle engine can replace this preview next.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Restart shell
          </button>
          <button
            type="button"
            onClick={onVictory}
            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Finish level
          </button>
        </div>
      </div>
    </div>
  );
}
