"use client";

type CarJamProps = {
  onGameOver: (finalScore: number) => void;
  onBack: () => void;
};

export function CarJam({ onGameOver, onBack }: CarJamProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black px-6 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 text-center backdrop-blur">
        <h1 className="mb-2 text-3xl font-bold text-white">Car Jam</h1>
        <p className="mb-6 text-slate-300">Gameplay canvas coming soon.</p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/60"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => onGameOver(0)}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            End Game
          </button>
        </div>
      </div>
    </div>
  );
}
