// connevia/src/config.ts
import Constants from "expo-constants";
import * as Updates from "expo-updates";

export type AppConfig = Readonly<{
  apiBase: string;
  auth0: Readonly<{
    domain: string;
    clientId: string;
    audience: string;
    scheme: string;
  }>;
}>;

const extra =
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined) ??
  ((Updates.manifest as any)?.extra as Record<string, unknown> | undefined) ??
  ({} as Record<string, unknown>);

function read(name: string): string {
  const fromEnv = process.env[name];
  const fromExtra = extra[name] as string | undefined;
  const v = fromEnv ?? fromExtra;
  if (!v) throw new Error(`Missing ${name} (set it in app.json -> expo.extra or as EXPO_PUBLIC_* env)`);
  return v;
}

export const CONFIG: AppConfig = {
  apiBase: read("EXPO_PUBLIC_API_URL"),
  auth0: {
    domain: read("EXPO_PUBLIC_AUTH0_DOMAIN"),
    clientId: read("EXPO_PUBLIC_AUTH0_CLIENT_ID"),
    audience: read("EXPO_PUBLIC_AUTH0_AUDIENCE"),
    scheme: "connevia",
  },
} as const;
