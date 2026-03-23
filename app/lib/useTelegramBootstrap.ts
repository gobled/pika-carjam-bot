"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadTelegramBootstrap,
  type TelegramBootstrapResult,
} from "@/app/lib/telegram";

const INITIAL_BOOTSTRAP: TelegramBootstrapResult = {
  environment: "browser",
  webApp: null,
  launchParams: null,
  session: {
    environment: "browser",
    launchSource: "local-dev",
    startParam: null,
    rawInitData: null,
    hasTelegramUser: false,
    user: {
      id: null,
      firstName: "Local",
      lastName: "Player",
      username: null,
      languageCode: null,
      isPremium: false,
    },
  },
  error: null,
};

const FALLBACK_ERROR = "We couldn't open the garage yet. Please try again.";

export function useTelegramBootstrap() {
  const [bootstrap, setBootstrap] = useState<TelegramBootstrapResult>(INITIAL_BOOTSTRAP);
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setFatalError(null);

    const frame = window.requestAnimationFrame(() => {
      if (!isMounted) {
        return;
      }

      try {
        setBootstrap(loadTelegramBootstrap());
      } catch (error) {
        console.error("Telegram bootstrap failed unexpectedly.", error);
        setFatalError(FALLBACK_ERROR);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(frame);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return {
    ...bootstrap,
    isLoading,
    fatalError,
    retry,
  };
}
