import * as Linking from "expo-linking";

/**
 * Must match `scheme` in app.config.ts.
 */
export const APP_AUTH_SCHEME = "firstchoice";

/**
 * Where the native app handles tokens (after bridge or direct deep link).
 */
export const PASSWORD_RECOVERY_APP_URI = `${APP_AUTH_SCHEME}://update-password`;

/**
 * HTTPS page on your marketing site: Mail opens Safari here; the page forwards
 * `?code=` / `#access_token=` to {@link PASSWORD_RECOVERY_APP_URI}.
 * Must match Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * Why not only `firstchoice://…`? Many users tap reset links in Mail → Safari
 * cannot open custom schemes reliably; Supabase may also fall back to Site URL.
 * A real URL avoids landing on the Netlify *home* page with no tokens.
 */
export const PASSWORD_RECOVERY_BRIDGE_URL =
  "https://firstchoicetransportation.netlify.app/auth/reset-password";

/**
 * `redirectTo` for `resetPasswordForEmail` — use HTTPS bridge so the email
 * never drops users on `/` with no recovery UI.
 */
export function getPasswordRecoveryRedirectTo(): string {
  return PASSWORD_RECOVERY_BRIDGE_URL;
}

/** Wildcard for native deep links after the bridge redirects. */
export const PASSWORD_RECOVERY_SUPABASE_REDIRECT_WILDCARD = "firstchoice://**";

function recoveryHintsInString(s: string): boolean {
  const lower = s.toLowerCase();
  return (
    lower.includes("update-password") ||
    lower.includes("auth/reset-password") ||
    lower.includes("type=recovery") ||
    lower.includes("recovery_token")
  );
}

/**
 * Detect recovery flows from implicit redirect URLs (hash/query) and from Expo-parsed paths.
 */
export function isPasswordRecoveryDeepLink(url: string): boolean {
  if (!url) return false;
  if (recoveryHintsInString(url)) return true;
  try {
    const parsed = Linking.parse(url);
    const path = `${parsed.path ?? ""}`.toLowerCase();
    if (path.includes("update-password") || path.includes("reset-password")) {
      return true;
    }
    const q = parsed.queryParams ?? {};
    const raw = q.type;
    const types = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
    if (types.some((t) => String(t).toLowerCase() === "recovery")) return true;
  } catch {
    return false;
  }
  return false;
}
