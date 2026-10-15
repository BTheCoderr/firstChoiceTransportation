"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const APP_DEEP_LINK = "firstchoice://update-password";

/**
 * Only forward actual Supabase password-recovery credentials. A bare page
 * visit, expired/error response or unrelated auth link must NEVER open the
 * app into a misleading empty recovery session.
 */
function getRecoveryRedirect(search: string, hash: string): string | null {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  if (query.has("error") || fragment.has("error") ||
      query.has("error_code") || fragment.has("error_code")) return null;
  const type = fragment.get("type") ?? query.get("type");
  if (type !== "recovery") return null;
  const hasSession = Boolean(fragment.get("access_token") && fragment.get("refresh_token"));
  const hasVerification = Boolean(query.get("token_hash"));
  if (!hasSession && !hasVerification) return null;
  return `${APP_DEEP_LINK}${search}${hash}`;
}

export default function AuthResetPasswordBridgePage() {
  const [openAppHref, setOpenAppHref] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    const target = getRecoveryRedirect(window.location.search, window.location.hash);
    if (!target) {
      setShowHelp(true);
      return;
    }
    setOpenAppHref(target);
    window.location.replace(target);
    const id = window.setTimeout(() => setShowHelp(true), 2500);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, padding: 24,
                   margin: "48px auto", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
        {openAppHref ? "Opening First Choice Transportation…" : "Password reset link unavailable"}
      </h1>
      <p>
        {openAppHref
          ? "Finish choosing your new password in the app."
          : "This link is missing recovery credentials, expired, or was opened incorrectly. Request a new password reset from the First Choice app sign-in screen."}
      </p>
      {showHelp && openAppHref ? (
        <a href={openAppHref} style={{ color: "#1d4ed8", fontWeight: 600 }}>
          Open First Choice app
        </a>
      ) : null}
      <p style={{ marginTop: 24 }}>
        <Link href="/support" style={{ color: "#1d4ed8" }}>Need help?</Link>
      </p>
    </main>
  );
}
