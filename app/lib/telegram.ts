import {
  retrieveLaunchParams,
  retrieveRawInitData,
  type LaunchParams,
} from "@telegram-apps/sdk";
import type { WebApp } from "telegram-web-app";

export type AppEnvironment = "telegram" | "browser";

export type TelegramSessionUser = {
  id: number | null;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  isPremium: boolean;
};

export type TelegramSession = {
  environment: AppEnvironment;
  launchSource: string | null;
  startParam: string | null;
  user: TelegramSessionUser;
  rawInitData: string | null;
  hasTelegramUser: boolean;
};

export type TelegramBootstrapResult = {
  environment: AppEnvironment;
  webApp: WebApp | null;
  launchParams: LaunchParams | null;
  session: TelegramSession;
  error: string | null;
};

const BROWSER_SESSION: TelegramSession = {
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
};

export function getTelegramWebApp(): WebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function detectAppEnvironment(webApp: WebApp | null = getTelegramWebApp()): AppEnvironment {
  return webApp ? "telegram" : "browser";
}


function getRawInitData(environment: AppEnvironment): string | null {
  if (environment !== "telegram") {
    return null;
  }

  try {
    return retrieveRawInitData() ?? null;
  } catch (error) {
    console.warn("Telegram raw init data bootstrap failed.", error);
    return null;
  }
}

export function parseTelegramSession(
  environment: AppEnvironment,
  launchParams: LaunchParams | null,
): TelegramSession {
  if (!launchParams?.tgWebAppData?.user) {
    return {
      ...BROWSER_SESSION,
      environment,
      launchSource: launchParams?.tgWebAppPlatform ?? BROWSER_SESSION.launchSource,
      startParam: launchParams?.tgWebAppStartParam ?? null,
      rawInitData: getRawInitData(environment),
    };
  }

  const { user } = launchParams.tgWebAppData;

  return {
    environment,
    launchSource: launchParams.tgWebAppPlatform ?? null,
    startParam: launchParams.tgWebAppStartParam ?? null,
    rawInitData: getRawInitData(environment),
    hasTelegramUser: true,
    user: {
      id: user.id ?? null,
      firstName: user.first_name ?? "Player",
      lastName: user.last_name ?? null,
      username: user.username ?? null,
      languageCode: user.language_code ?? null,
      isPremium: Boolean(user.is_premium),
    },
  };
}

export function initializeTelegramWebApp(webApp: WebApp | null) {
  if (!webApp) {
    return;
  }

  webApp.ready();
  webApp.expand();

  try {
    webApp.requestFullscreen?.();
  } catch (error) {
    console.warn("Telegram requestFullscreen failed.", error);
  }

  try {
    webApp.enableClosingConfirmation?.();
  } catch (error) {
    console.warn("Telegram enableClosingConfirmation failed.", error);
  }

  try {
    webApp.lockOrientation?.();
  } catch (error) {
    console.warn("Telegram lockOrientation failed.", error);
  }
}

export function loadTelegramBootstrap(): TelegramBootstrapResult {
  const webApp = getTelegramWebApp();
  const environment = detectAppEnvironment(webApp);

  try {
    const launchParams = webApp ? retrieveLaunchParams() : null;

    if (webApp) {
      initializeTelegramWebApp(webApp);
    }

    return {
      environment,
      webApp,
      launchParams,
      session: parseTelegramSession(environment, launchParams),
      error: null,
    };
  } catch (error) {
    console.warn("Telegram launch parameter bootstrap failed.", error);

    return {
      environment,
      webApp,
      launchParams: null,
      session: parseTelegramSession(environment, null),
      error:
        environment === "telegram"
          ? "We couldn't read your Telegram session yet. You can still browse the shell, but profile features may be limited."
          : null,
    };
  }
}

export function getDisplayName(session: TelegramSession) {
  const { firstName, lastName } = session.user;
  return lastName ? `${firstName} ${lastName}` : firstName;
}
