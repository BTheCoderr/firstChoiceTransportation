"use client";

import { useEffect, useState } from "react";

/**
 * Supabase `redirectTo` target (HTTPS so Mail/Safari opens a real page).
 * Forwards hash + query to the native app, which completes recovery in-app.
 * Must match `PASSWORD_RECOVERY_BRIDGE_URL` in the Expo app.
 */
const APP_DEEP_LINK = "firstchoice://update-password";

export default function AuthResetPasswordBridgePage() {
  const [openAppHref, setOpenAppHref] = useState(APP_DEEP_LINK);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const target = `${APP_DEEP_LINK}${window.location.search}${window.location.hash}`;
    setOpenAppHref(target);
    window.location.replace(target);
    const id = window.setTimeout(() => setShowHelp(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <main
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: 24,
        maxWidth: 480,
        margin: "48px auto",
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: "1.35rem", marginBottom: 12 }}>
        Opening First Choice Transportation…
      </h1>
      <p style={{ color: "#444" }}>
        Finish resetting your password in the app. If nothing happens, use the
        button below.
      </p>
      {showHelp ? (
        <p style={{ marginTop: 20 }}>
          <a
            href={openAppHref}
            style={{ color: "#2563eb", fontWeight: 600 }}
          >
            Open in app
          </a>
        </p>
      ) : null}
    </main>
  );
}
