// src/config/env.ts
import Constants from "expo-constants";

type EnvKey =
  | "EXPO_PUBLIC_AUTH0_CLIENT_ID"
  | "EXPO_PUBLIC_AUTH0_DOMAIN"
  | "EXPO_PUBLIC_AUTH0_AUDIENCE"
  | "EXPO_PUBLIC_API_URL";

function get(key: EnvKey): string {
  // Read from app.json -> expo.extra
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromExtra = extra[key];

  // Fallback: real env vars if you ever inject them
  const fromEnv = (process.env as any)?.[key];

  const value = (fromExtra ?? fromEnv) as string | undefined;

  if (!value) {
    throw new Error(`Missing env value: ${key} (add it to app.json -> expo.extra)`);
  }

  return value;
}

export const ENV = {
  AUTH0_CLIENT_ID: get("EXPO_PUBLIC_AUTH0_CLIENT_ID"),
  AUTH0_DOMAIN: get("EXPO_PUBLIC_AUTH0_DOMAIN"),
  AUTH0_AUDIENCE: get("EXPO_PUBLIC_AUTH0_AUDIENCE"),
  API_URL: get("EXPO_PUBLIC_API_URL"),
} as const;
