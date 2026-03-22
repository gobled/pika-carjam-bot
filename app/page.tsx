"use client";

import { useEffect, useMemo, useState } from "react";
import { retrieveLaunchParams, type LaunchParams } from "@telegram-apps/sdk";
import type { WebApp } from "telegram-web-app";
import { CarJam } from "@/app/components/CarJam";
import { getTelegramWebApp } from "@/app/lib/telegram";

const INITIAL_PLAYS = 1000;
const REFERRAL_REWARD_PLAYS = 3;
const STORAGE_KEYS = {
  highScore: "carJamHighScore",
  muted: "carJamMuted",
  lastResetDate: "carJamLastResetDate",
  playsLeft: "carJamPlaysLeft",
} as const;

export default function HomePage() {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [launchParams, setLaunchParams] = useState<LaunchParams | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playsLeft, setPlaysLeft] = useState<number>(INITIAL_PLAYS);
  const [activeTab, setActiveTab] = useState<'play' | 'referrals'>('play');
  const [referralStats, setReferralStats] = useState<{
    totalReferrals: number;
    unclaimedReferrals: number;
  }>({ totalReferrals: 0, unclaimedReferrals: 0 });

  useEffect(() => {
    try {
      setLaunchParams(retrieveLaunchParams());
    } catch (error) {
      console.warn("Unable to retrieve launch params outside Telegram.", error);
    }

    // Load high score from localStorage
    const savedHighScore = localStorage.getItem(STORAGE_KEYS.highScore);
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }

    // Load mute preference from localStorage
    const savedMutePreference = localStorage.getItem(STORAGE_KEYS.muted);
    if (savedMutePreference) {
      setIsMuted(savedMutePreference === "true");
    }

    // Initialize remaining plays with daily reset logic
    const initializePlaysLeft = () => {
      const today = new Date().toDateString(); // Get current date as string
      const lastResetDate = localStorage.getItem(STORAGE_KEYS.lastResetDate);
      const savedPlays = localStorage.getItem(STORAGE_KEYS.playsLeft);

      // Check if we need to reset (new day or first time)
      if (lastResetDate !== today) {
        // New day - reset plays to the daily default
        localStorage.setItem(STORAGE_KEYS.playsLeft, String(INITIAL_PLAYS));
        localStorage.setItem(STORAGE_KEYS.lastResetDate, today);
        setPlaysLeft(INITIAL_PLAYS);
      } else {
        // Same day - use saved plays
        if (savedPlays === null) {
          localStorage.setItem(STORAGE_KEYS.playsLeft, String(INITIAL_PLAYS));
          setPlaysLeft(INITIAL_PLAYS);
        } else {
          const parsed = parseInt(savedPlays, 10);
          setPlaysLeft(Number.isNaN(parsed) ? INITIAL_PLAYS : parsed);
        }
      }
    };

    initializePlaysLeft();
  }, []);

  useEffect(() => {
    // Prevent pull-to-refresh and overscroll
    const preventPullToRefresh = (e: TouchEvent) => {
      if (e.touches.length > 1) return;

      const target = e.target as HTMLElement;
      const scrollY = window.scrollY || window.pageYOffset;

      if (scrollY === 0 && e.touches[0].clientY > e.touches[0].pageY) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventPullToRefresh);
    };
  }, []);

  useEffect(() => {
    // Wait for Telegram WebApp script to load
    const initTelegram = () => {
      const tg = getTelegramWebApp();
      if (!tg) {
        return;
      }

      tg.ready();
      tg.expand();

      // Request fullscreen mode
      if (tg.requestFullscreen) {
        try {
          tg.requestFullscreen();
        } catch (error) {
          console.warn("Failed to enter fullscreen mode:", error);
        }
      }

      // Enable close confirmation (optional)
      tg.enableClosingConfirmation();

      // Lock orientation to portrait for mobile
      if (tg.lockOrientation) {
        tg.lockOrientation();
      }

      setWebApp(tg);
    };

    // Try immediately
    initTelegram();

    // Also try after a short delay in case script is still loading
    const timer = setTimeout(initTelegram, 100);

    return () => clearTimeout(timer);
  }, []);

  const user = launchParams?.initData?.user;
  const fullName = useMemo(() => {
    if (!user) {
      return "Guest";
    }
    return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
  }, [user]);

  const username = user?.username ? `@${user.username}` : null;

  // Fetch referral stats
  useEffect(() => {
    const fetchReferralStats = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/referrals/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setReferralStats({
            totalReferrals: data.totalReferrals || 0,
            unclaimedReferrals: data.unclaimedReferrals || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching referral stats:', error);
      }
    };

    fetchReferralStats();
    // Refresh stats when switching to referrals tab
    if (activeTab === 'referrals') {
      fetchReferralStats();
    }
  }, [user?.id, activeTab]);

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem(STORAGE_KEYS.muted, newMuteState.toString());
    if (webApp) {
      webApp.HapticFeedback?.impactOccurred("soft");
    }
  };

  const handlePlay = () => {
    if (playsLeft <= 0) {
      if (webApp?.showAlert) {
        webApp.showAlert(`No plays left. Come back tomorrow for ${INITIAL_PLAYS} more plays!`);
      }
      return;
    }
    if (webApp) {
      webApp.expand();
      webApp.HapticFeedback?.impactOccurred("medium");
    }
    // Consume a play when starting from the main screen
    setPlaysLeft((prev) => {
      const next = Math.max(prev - 1, 0);
      localStorage.setItem(STORAGE_KEYS.playsLeft, String(next));
      // Update the date to current day (in case user plays across midnight)
      localStorage.setItem(STORAGE_KEYS.lastResetDate, new Date().toDateString());
      return next;
    });
    setIsPlaying(true);
  };

  const handleGameOver = (finalScore: number) => {
    if (webApp) {
      webApp.HapticFeedback?.notificationOccurred("success");
    }
    // Return to the main screen so there is only one main view
    setIsPlaying(false);
  };

  const handleShareForPlay = async () => {
    const botUsername = process.env.BOT_USERNAME;
    if (!webApp) {
      console.log("Share tapped outside Telegram");
      return;
    }
    if (!botUsername) {
      webApp?.showAlert?.('Sharing unavailable: bot username is not configured. Set NEXT_PUBLIC_BOT_USERNAME.');
      return;
    }

    const text = 'Join me in Pika CarJam! Tap to play our Telegram Mini App.';
    // Use startapp deep link so recipients add/open the bot Mini App directly
    const startappPayload = user?.id ? `invite_${user.id}` : 'play';
    const miniAppLink = `https://t.me/${botUsername}?start=${encodeURIComponent(startappPayload)}`;
    const tgShare = `https://t.me/share/url?url=${encodeURIComponent(miniAppLink)}&text=${encodeURIComponent(text)}`;

    try {
      if (webApp && typeof webApp.openTelegramLink === 'function') {
        webApp.openTelegramLink(tgShare);
        webApp.HapticFeedback?.impactOccurred("soft");
      } else if (typeof window !== 'undefined') {
        // Fallback: try opening Telegram share link directly
        window.open(tgShare, '_blank');
      }
    } catch (e) {
      console.error('Error sharing:', e);
    }
  };

  const handleClaimReferrals = async () => {
    if (!user?.id) {
      console.log("No user ID available");
      return;
    }

    if (referralStats.unclaimedReferrals === 0) {
      webApp?.showAlert?.("No referral rewards to claim!");
      return;
    }

    try {
      webApp?.HapticFeedback?.impactOccurred("soft");
      const response = await fetch("/api/referrals/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = typeof errorBody?.error === "string" ? errorBody.error : "Unable to claim rewards.";
        throw new Error(message);
      }

      const data = await response.json();
      const playsAwarded = data.playsAwarded || 0;

      // Update plays left
      setPlaysLeft((prev) => {
        const next = prev + playsAwarded;
        localStorage.setItem(STORAGE_KEYS.playsLeft, String(next));
        // Update the date to current day
        localStorage.setItem(STORAGE_KEYS.lastResetDate, new Date().toDateString());
        return next;
      });

      // Update referral stats
      setReferralStats((prev) => ({
        ...prev,
        unclaimedReferrals: 0,
      }));

      webApp?.HapticFeedback?.notificationOccurred("success");
      webApp?.showPopup?.({
        title: "Rewards Claimed!",
        message: `You received ${playsAwarded} plays from ${data.rewardsClaimed} referral${data.rewardsClaimed > 1 ? 's' : ''}!`,
        buttons: [{ type: "close", text: "Awesome!" }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      if (webApp?.showAlert) {
        webApp.showAlert(message);
      } else {
        console.error("Claim referrals error:", error);
      }
    }
  };

  const handleBuySticker = async () => {
    if (!webApp) {
      console.log("Buy Sticker tapped outside Telegram");
      return;
    }

    if (!user?.id) {
      webApp.showAlert("We could not determine your Telegram account. Please try again.");
      return;
    }

    try {
      webApp.HapticFeedback?.impactOccurred("soft");
      const response = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "sticker", userId: user.id }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = typeof errorBody?.error === "string" ? errorBody.error : "Unable to start purchase.";
        throw new Error(message);
      }

      const data = (await response.json()) as { invoiceUrl?: string };
      if (!data.invoiceUrl) {
        throw new Error("Invoice URL missing in response.");
      }

      webApp.openInvoice(data.invoiceUrl, (status) => {
        if (status === "paid") {
          webApp.showPopup?.({
            title: "Thanks!",
            message: "Sticker pack purchase confirmed. Check the chat for details.",
            buttons: [{ type: "close", text: "Close" }],
          });
        } else if (status === "failed") {
          webApp.showAlert("Payment failed. Please try again.");
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      if (webApp.showAlert) {
        webApp.showAlert(message);
      } else {
        console.error("Sticker purchase error:", error);
      }
    }
  };

  if (isPlaying) {
    return (
      <CarJam
        onGameOver={handleGameOver}
        onBack={() => setIsPlaying(false)}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black px-6 py-12 text-slate-100" style={{ overflowY: 'auto', overscrollBehavior: 'none' }}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-10 text-center backdrop-blur" style={{ touchAction: 'pan-y' }}>
        <h1 className="text-4xl font-bold text-white mb-2">Pika CarJam</h1>
        <p className="text-slate-400">Clear the traffic jam and help the car escape!</p>
        <p className="mt-2 mb-6 text-sm text-slate-300">
          Welcome, {fullName}{username ? ` (${username})` : ''}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveTab('play');
              if (webApp) webApp.HapticFeedback?.impactOccurred("soft");
            }}
            className={`flex-1 pb-3 text-sm font-semibold transition ${
              activeTab === 'play'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Play
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('referrals');
              if (webApp) webApp.HapticFeedback?.impactOccurred("soft");
            }}
            className={`flex-1 pb-3 text-sm font-semibold transition relative ${
              activeTab === 'referrals'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Referrals
            {referralStats.unclaimedReferrals > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {referralStats.unclaimedReferrals}
              </span>
            )}
          </button>
        </div>

        {/* Play Tab Content */}
        {activeTab === 'play' && (
          <>
            {/* High Score Display */}
            {highScore > 0 && (
              <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4">
                <p className="text-xs text-emerald-400">High Score</p>
                <p className="text-3xl font-bold text-emerald-400">{highScore}</p>
              </div>
            )}

            {/* Plays Left */}
            <div className="mb-4">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200 border border-white/10">
                Plays left: {playsLeft}
              </span>
            </div>

            {/* Mute Button */}
            <div className="mb-4 flex justify-center gap-4">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-lg bg-black/50 px-6 py-3 backdrop-blur transition hover:bg-black/70 border border-white/10"
                aria-label={isMuted ? "Unmute sound" : "Mute sound"}
              >
                <span className="text-2xl">
                  {isMuted ? "🔇" : "🔊"}
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  {isMuted ? "Muted" : "Sound On"}
                </p>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePlay}
              disabled={playsLeft <= 0}
              className={`mt-2 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-lg font-semibold text-white shadow-lg transition focus:outline-none focus-visible:ring-2 ${
                playsLeft > 0
                  ? "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-400 focus-visible:ring-emerald-300"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {playsLeft > 0 ? "Play" : "No plays left"}
            </button>

            <button
              type="button"
              onClick={handleShareForPlay}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full px-6 py-2 text-sm font-semibold transition border bg-blue-500/90 text-white border-blue-400 hover:bg-blue-500"
            >
              📤 Share & Invite Friends
            </button>
          </>
        )}

        {/* Referrals Tab Content */}
        {activeTab === 'referrals' && (
          <>
            <div className="mb-6 text-left">
              <h2 className="text-2xl font-bold text-white mb-2">Invite Friends</h2>
              <p className="text-sm text-slate-300">
                Share your invite link and get <span className="text-emerald-400 font-semibold">{REFERRAL_REWARD_PLAYS} plays</span> for each friend who joins!
              </p>
            </div>

            {/* Referral Stats */}
            <div className="mb-6 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Total Referrals</span>
                  <span className="text-white text-2xl font-bold">{referralStats.totalReferrals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Unclaimed Rewards</span>
                  <span className="text-emerald-400 text-2xl font-bold">{referralStats.unclaimedReferrals}</span>
                </div>
              </div>

              {referralStats.unclaimedReferrals > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <p className="text-emerald-400 text-sm mb-1">
                    🎉 You have {referralStats.unclaimedReferrals} pending referral{referralStats.unclaimedReferrals > 1 ? 's' : ''}!
                  </p>
                  <p className="text-slate-300 text-xs">
                    Claim to get {referralStats.unclaimedReferrals * REFERRAL_REWARD_PLAYS} plays
                  </p>
                </div>
              )}
            </div>

            {/* Claim Button */}
            <button
              type="button"
              onClick={handleClaimReferrals}
              disabled={referralStats.unclaimedReferrals === 0}
              className={`w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-lg font-semibold text-white shadow-lg transition focus:outline-none focus-visible:ring-2 mb-3 ${
                referralStats.unclaimedReferrals > 0
                  ? "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-400 focus-visible:ring-emerald-300"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {referralStats.unclaimedReferrals > 0
                ? `Claim ${referralStats.unclaimedReferrals * REFERRAL_REWARD_PLAYS} Plays`
                : 'No Rewards to Claim'}
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShareForPlay}
              className="w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-blue-500/90 text-white border border-blue-400 hover:bg-blue-500 transition"
            >
              📤 Share Invite Link
            </button>

            <p className="mt-4 text-xs text-slate-400">
              Share your link with friends. When they join and play, you'll earn {REFERRAL_REWARD_PLAYS} plays per referral!
            </p>
          </>
        )}
        {/* <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5 text-left">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-emerald-400">Limited Drop</p>
              <p className="text-lg font-semibold text-white">Task Board Sticker Pack</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-emerald-300">
              10 Stars
            </span>
          </div>
          <p className="text-sm text-slate-300">
            Grab a holographic sticker trio to celebrate your Task Board progress. Tap buy to
            trigger the in-chat Stars payment flow.
          </p>
          <button
            type="button"
            onClick={handleBuySticker}
            className="inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Buy Sticker Pack 1
          </button>
        </div> */}

        {!webApp && (
          <p className="mt-6 text-xs text-amber-300">
            Open this Mini App inside Telegram to access the full experience.
          </p>
        )}
      </div>
    </div>
  );
}
