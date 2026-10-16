/**
 * Only the native First Choice recovery screen and its exact HTTPS callback
 * may supply one-time Supabase auth credentials. Deep links into another app
 * page (or an arbitrary website) cannot replace the current signed-in user.
 */
export function isTrustedRecoveryCallback(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "firstchoice:") {
      const host = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
      return (host === "update-password" && pathname === "/") ||
        (host === "" && pathname === "/update-password");
    }
    return parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === "firstchoicetransportation.netlify.app" &&
      parsed.pathname === "/auth/reset-password" &&
      !parsed.username && !parsed.password && !parsed.port;
  } catch {
    return false;
  }
}
