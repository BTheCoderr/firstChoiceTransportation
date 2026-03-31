import {
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  getSupabaseAnonKeyKind,
  logSupabaseClientDebug,
} from "@/lib/supabase";

const DBG = "[CreateDriver][debug]";

/** Max time to wait for the Edge Function HTTP response before failing cleanly. */
const CREATE_DRIVER_TIMEOUT_MS = 45_000;
/** `getSession()` should be fast; if SecureStore/network hangs, don't block the UI forever. */
const GET_SESSION_TIMEOUT_MS = 12_000;

async function getSessionWithTimeout(ms: number) {
  return Promise.race([
    supabase.auth.getSession().then((r) => ({ kind: "ok" as const, ...r })),
    new Promise<{ kind: "timeout" }>((resolve) =>
      setTimeout(() => resolve({ kind: "timeout" }), ms)
    ),
  ]);
}

function detailFromFunctionsHttp(status: number, raw: string, fallback: string): string {
  if (!raw?.trim()) return `${fallback} (HTTP ${status})`;
  try {
    const j = JSON.parse(raw) as {
      error?: string;
      message?: string;
      msg?: string;
    };
    const m = j.error ?? j.message ?? j.msg;
    if (typeof m === "string" && m.trim()) {
      return `${m.trim()} (HTTP ${status})`;
    }
  } catch {
    const t = raw.trim().slice(0, 280);
    if (t) return `${t} (HTTP ${status})`;
  }
  return `${fallback} (HTTP ${status})`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export interface CreateDriverInput {
  email: string;
  full_name: string;
  password: string;
  /** Optional. If provided with lat/lng, creates the driver's home base. */
  home_base_address?: string | null;
  home_base_latitude?: number | null;
  home_base_longitude?: number | null;
  /**
   * Admin JWT from auth context (in memory). When set, skips `getSession()` / SecureStore —
   * avoids hangs from concurrent refresh + storage on some devices.
   */
  accessToken?: string | null;
}

export interface CreateDriverResult {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

/**
 * Create a new driver account. Admin only.
 * Calls the create-driver Edge Function (service role + admin check server-side).
 *
 * Uses a direct `fetch` with explicit `apikey` and `Authorization`, and a timeout
 * so the UI never waits forever on a hung request.
 */
export async function createDriver(
  input: CreateDriverInput
): Promise<CreateDriverResult> {
  if (__DEV__) {
    logSupabaseClientDebug(DBG);
  }

  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
    if (__DEV__) {
      console.log(DBG, "early exit: missing EXPO_PUBLIC url or anon key");
    }
    return {
      success: false,
      error:
        "App configuration error: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing.",
    };
  }

  if (__DEV__) {
    console.log(DBG, {
      supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
      anonKeyKind: getSupabaseAnonKeyKind(),
      hasInputAccessToken: Boolean(input.accessToken?.trim()),
    });
  }

  let accessToken = input.accessToken?.trim() || null;
  let accessTokenSource: "input" | "getSession" | "none" = accessToken ? "input" : "none";

  if (!accessToken) {
    if (__DEV__) {
      console.log(DBG, "getSession: started (with timeout)", {
        timeoutMs: GET_SESSION_TIMEOUT_MS,
      });
    }
    const sr = await getSessionWithTimeout(GET_SESSION_TIMEOUT_MS);
    if (__DEV__) {
      if (sr.kind === "timeout") {
        console.log(DBG, "getSession: completed", { outcome: "timeout" });
      } else {
        console.log(DBG, "getSession: completed", {
          outcome: "ok",
          hasSession: Boolean(sr.data.session),
          hasAccessToken: Boolean(sr.data.session?.access_token),
          sessionError: sr.error?.message ?? null,
        });
      }
    }
    if (sr.kind === "timeout") {
      return {
        success: false,
        error: "Auth check timed out. Check your connection, then try again.",
      };
    }
    const session = sr.data.session;
    const sessionError = sr.error;

    if (sessionError || !session?.access_token) {
      return {
        success: false,
        error:
          "You are not signed in or your session has expired. Sign out, sign in again as admin, then try again.",
      };
    }
    accessToken = session.access_token;
    accessTokenSource = "getSession";
  } else if (__DEV__) {
    console.log(DBG, "getSession: skipped (using input accessToken)", {
      hasAccessToken: true,
    });
  }

  if (__DEV__) {
    console.log(DBG, "auth resolved", {
      accessTokenSource,
      hasAccessToken: Boolean(accessToken),
    });
  }

  const body: Record<string, unknown> = {
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name.trim(),
    password: input.password,
  };
  if (input.home_base_address != null) {
    body.home_base_address = input.home_base_address.trim() || null;
  }
  if (input.home_base_latitude != null && typeof input.home_base_latitude === "number") {
    body.home_base_latitude = input.home_base_latitude;
  }
  if (input.home_base_longitude != null && typeof input.home_base_longitude === "number") {
    body.home_base_longitude = input.home_base_longitude;
  }

  const base = supabaseUrl.replace(/\/+$/, "");
  const fnUrl = `${base}/functions/v1/create-driver`;

  let res: Response;
  try {
    if (__DEV__) {
      console.log(DBG, "request: started", {
        method: "POST",
        url: fnUrl,
        timeoutMs: CREATE_DRIVER_TIMEOUT_MS,
      });
    }
    res = await fetchWithTimeout(
      fnUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
          /* Align with supabase-js default; some gateways are picky about header set. */
          "X-Client-Info": "supabase-js-react-native/firstChoiceTransportation",
        },
        body: JSON.stringify(body),
      },
      CREATE_DRIVER_TIMEOUT_MS
    );
  } catch (e) {
    const err = e instanceof Error ? e : null;
    if (__DEV__) {
      console.log(DBG, "request: thrown", {
        name: err?.name ?? "(non-Error)",
        message: err?.message ?? String(e),
      });
    }
    const aborted =
      err?.name === "AbortError" || /aborted|AbortError/i.test(String(err?.message));
    if (aborted) {
      if (__DEV__) {
        console.log(DBG, "response: fetch aborted (timeout)", {
          timeoutMs: CREATE_DRIVER_TIMEOUT_MS,
        });
      }
      return {
        success: false,
        error: `Request timed out after ${CREATE_DRIVER_TIMEOUT_MS / 1000} seconds. Check your connection and try again.`,
      };
    }
    const msg = err?.message ?? "Network error";
    return { success: false, error: msg };
  }

  const rawText = await res.text();

  if (__DEV__) {
    console.log(DBG, "response: status", {
      status: res.status,
      ok: res.ok,
      bodyPreviewChars: Math.min(rawText.length, 200),
    });
  }

  if (!res.ok) {
    const errDetail = detailFromFunctionsHttp(
      res.status,
      rawText,
      "Edge Function request failed"
    );
    if (__DEV__) {
      console.log(DBG, "response: not ok", {
        userMessage: errDetail,
        rawPreview: rawText.slice(0, 200),
      });
    }
    const gatewayJwt401 = res.status === 401 && /invalid jwt/i.test(rawText);
    if (gatewayJwt401) {
      return {
        success: false,
        error:
          "Create driver is blocked by Supabase (gateway JWT check). Deploy create-driver with JWT verification off: from the project folder run `npm run deploy:create-driver` (Supabase CLI logged in), or disable verify JWT for this function in the Supabase dashboard.",
      };
    }
    return {
      success: false,
      error: errDetail,
    };
  }

  let parsed: { success?: boolean; error?: string; userId?: string; email?: string };
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    if (__DEV__) {
      console.log(DBG, "response: JSON parse failed", {
        rawPreview: rawText.slice(0, 200),
      });
    }
    return { success: false, error: "Invalid response from server." };
  }

  if (__DEV__) {
    console.log(DBG, "response: parsed", {
      success: parsed.success,
      error: parsed.error ?? null,
      hasUserId: Boolean(parsed.userId),
      emailFromServer: parsed.email ?? null,
    });
  }

  if (parsed.error) {
    return { success: false, error: parsed.error };
  }
  if (parsed.success) {
    if (__DEV__) {
      console.log(DBG, "createDriver: success");
    }
    return {
      success: true,
      userId: parsed.userId,
      email: parsed.email,
    };
  }
  if (__DEV__) {
    console.log(DBG, "createDriver: unknown error shape", {
      keys: Object.keys(parsed),
    });
  }
  return { success: false, error: "Unknown error" };
}
