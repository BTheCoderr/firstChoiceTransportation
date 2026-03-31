import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { Database } from "@/types/database";

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function extraConfig(): Extra {
  const e = Constants.expoConfig?.extra as Extra | undefined;
  return e ?? {};
}

/**
 * Dev-only placeholders so Metro can evaluate route modules when `.env` is empty.
 * Prefer real values in `.env`; `app.config.ts` also passes them via `extra` when Metro omits `process.env`.
 */
const DEV_FALLBACK_URL = "https://missing-env.supabase.co";
const DEV_FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dev-placeholder-not-valid";

const fromExtra = extraConfig();
const rawUrl = (
  (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim() ||
  (fromExtra.supabaseUrl ?? "").trim()
).trim();
const rawKey = (
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim() ||
  (fromExtra.supabaseAnonKey ?? "").trim()
).trim();

/** Exported for Edge Function calls that need a direct `fetch` with explicit headers. */
export const supabaseUrl =
  rawUrl || (__DEV__ ? DEV_FALLBACK_URL : "");
/**
 * Use the legacy **anon JWT** (starts with `eyJ`) from Dashboard → API Keys →
 * "Legacy anon, service_role API keys". New **publishable** keys (`sb_publishable_…`)
 * can trigger **401** on `functions/v1/*` while JWT verification is enabled on the gateway.
 */
export const supabaseAnonKey =
  rawKey || (__DEV__ ? DEV_FALLBACK_ANON_KEY : "");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy env.sample to .env, set both values from Supabase → API, then restart Expo."
  );
}

if (__DEV__ && (!rawUrl || !rawKey)) {
  console.warn(
    "[Supabase] .env is missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — using dev placeholders. Copy env.sample to .env, add real values, restart Metro."
  );
}

/** TEMP: debug — anon key shape only, never log the full key. */
export type SupabaseAnonKeyKind = "legacy_jwt" | "publishable" | "empty" | "other";

export function getSupabaseAnonKeyKind(): SupabaseAnonKeyKind {
  const k = supabaseAnonKey.trim();
  if (!k) return "empty";
  if (k.startsWith("eyJ")) return "legacy_jwt";
  if (k.startsWith("sb_publishable_")) return "publishable";
  return "other";
}

/** TEMP: debug — safe snapshot of client config (no secrets). */
export function logSupabaseClientDebug(scope = "[Supabase][debug]"): void {
  if (!__DEV__) return;
  console.log(scope, {
    supabaseUrl: supabaseUrl?.trim() || "(empty)",
    anonKeyKind: getSupabaseAnonKeyKind(),
  });
}

if (__DEV__ && supabaseAnonKey.startsWith("sb_publishable_")) {
  console.warn(
    "[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is publishable (sb_publishable_*). Edge Functions may 401 until you use the legacy anon JWT (eyJ…) or change verify_jwt. https://supabase.com/docs/guides/troubleshooting/edge-function-401-error-response"
  );
}

if (__DEV__) {
  logSupabaseClientDebug("[Supabase][debug] module init");
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const value = await SecureStore.getItemAsync(key);
    return value;
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
