import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

/**
 * Parse hash + query from a deep link. Handles custom schemes if `new URL` is unreliable.
 */
function parseAuthUrlParts(url: string): {
  hashParams: URLSearchParams;
  searchParams: URLSearchParams;
} {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash?.replace(/^#/, "") ?? "";
    return {
      hashParams: new URLSearchParams(hash),
      searchParams: new URLSearchParams(parsed.search),
    };
  } catch {
    const parsed = Linking.parse(url);
    const searchParams = new URLSearchParams();
    if (parsed.queryParams) {
      for (const [k, v] of Object.entries(parsed.queryParams)) {
        if (Array.isArray(v)) {
          v.forEach((x) => searchParams.append(k, String(x)));
        } else if (v != null) {
          searchParams.set(k, String(v));
        }
      }
    }
    const hashIdx = url.indexOf("#");
    const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : "";
    return {
      hashParams: new URLSearchParams(hash),
      searchParams,
    };
  }
}

/**
 * Handles deep links from Supabase auth (password recovery, magic links).
 * - Implicit flow: access_token + refresh_token in hash or query
 * - PKCE: ?code=… → exchangeCodeForSession
 * - Email link: token_hash + type=recovery → verifyOtp
 * Required because `detectSessionInUrl` is false for native SecureStore auth.
 */
export async function handleSupabaseAuthUrl(url: string): Promise<boolean> {
  try {
    const { hashParams, searchParams } = parseAuthUrlParts(url);

    const access_token =
      hashParams.get("access_token") ?? searchParams.get("access_token");
    const refresh_token =
      hashParams.get("refresh_token") ?? searchParams.get("refresh_token");

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) {
        if (__DEV__) {
          console.warn("[Auth URL] setSession failed:", error.message);
        }
        return false;
      }
      return true;
    }

    const code =
      searchParams.get("code") ?? hashParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        if (__DEV__) {
          console.warn(
            "[Auth URL] exchangeCodeForSession failed:",
            error.message
          );
        }
        return false;
      }
      return true;
    }

    const token_hash =
      searchParams.get("token_hash") ?? hashParams.get("token_hash");
    const typeRaw =
      searchParams.get("type") ?? hashParams.get("type") ?? "";
    if (
      token_hash &&
      String(typeRaw).toLowerCase() === "recovery"
    ) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: "recovery",
      });
      if (error) {
        if (__DEV__) {
          console.warn("[Auth URL] verifyOtp(recovery) failed:", error.message);
        }
        return false;
      }
      return true;
    }
  } catch (e) {
    if (__DEV__) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[Auth URL] parse or handler error:", msg);
    }
    return false;
  }
  return false;
}
