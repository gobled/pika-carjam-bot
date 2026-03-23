import type { WebApp } from "telegram-web-app";

export function getTelegramWebApp(): WebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

