"use client";

import { useEffect, useState } from "react";
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

export function useTelegramBootstrap() {
  const [bootstrap, setBootstrap] = useState<TelegramBootstrapResult>(INITIAL_BOOTSTRAP);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const timer = window.setTimeout(() => {
      if (!isMounted) {
        return;
      }

      setBootstrap(loadTelegramBootstrap());
      setIsLoading(false);
    }, 120);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  return {
    ...bootstrap,
    isLoading,
  };
}
