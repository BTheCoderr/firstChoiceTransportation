import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { InteractionManager } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AuthApiError } from "@supabase/supabase-js";
import { handleSupabaseAuthUrl } from "@/auth/handleSupabaseAuthUrl";
import {
  isPasswordRecoveryDeepLink,
  PASSWORD_RECOVERY_APP_URI,
  PASSWORD_RECOVERY_BRIDGE_URL,
} from "@/auth/passwordRecovery";
import { supabase } from "@/lib/supabase";
import {
  loadProfileForUser,
  profileErrorMessage,
  type ProfileLoadResult,
} from "@/services/profile";
import { setSessionState } from "@/services/sessionService";
import type { AppProfile, AuthSessionState, UserRole } from "@/types/app";

export type ProfileErrorCode = "PROFILE_MISSING" | "COMPANY_MISMATCH" | "ROLE_MISSING";

/** Stable key for deduping auth session applies; null when there is no session. */
function getSessionKey(session: Session | null): string | null {
  if (!session) return null;
  return `${session.user?.id ?? "anon"}:${session.access_token ?? ""}`;
}

interface AuthContextValue extends AuthSessionState {
  /** Current JWT from memory (same session as Supabase auth). Prefer this over calling `getSession()` again to avoid SecureStore contention. */
  accessToken: string | null;
  /** True while a profile fetch for the current user is in flight (avoids UI flash before profile resolves). */
  profileLoading: boolean;
  /** Set when user is signed in but profile failed to load or validate. Null when profile is ok or no user. */
  profileError: string | null;
  /**
   * True while the user must set a new password (recovery session). Profile is not loaded so
   * `app/index` does not redirect to admin/driver before `update-password`.
   */
  recoveryInProgress: boolean;
  signOut: () => Promise<void>;
  retryLoadProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthSessionState["user"]>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);
  const profileLoadGenRef = useRef(0);
  const recoveryInProgressRef = useRef(false);
  const recoveryNavScheduledRef = useRef(false);
  /** Last applied session key; `undefined` means nothing applied yet (bootstrap). */
  const lastAppliedSessionKeyRef = useRef<string | null | undefined>(undefined);
  const lastProfileUserIdRef = useRef<string | null>(null);

  const scheduleRecoveryNav = useCallback(() => {
    if (recoveryNavScheduledRef.current) return;
    recoveryNavScheduledRef.current = true;
    InteractionManager.runAfterInteractions(() => {
      router.replace("/(auth)/update-password");
    });
  }, []);

  const clearRecoveryFlags = useCallback(() => {
    recoveryInProgressRef.current = false;
    recoveryNavScheduledRef.current = false;
    setRecoveryInProgress(false);
  }, []);

  const applyAuthSession = useCallback((next: Session | null) => {
    const nextKey = getSessionKey(next);
    if (
      lastAppliedSessionKeyRef.current !== undefined &&
      nextKey === lastAppliedSessionKeyRef.current
    ) {
      if (__DEV__) {
        console.log(
          "[AuthProvider] applyAuthSession skipped (same key)",
          next?.user?.id ?? null
        );
      }
      return;
    }
    lastAppliedSessionKeyRef.current = nextKey;
    setSession(next);
    setUser(next?.user ?? null);
    setSessionState(next ?? null);
    if (__DEV__) {
      console.log(
        "[AuthProvider] applyAuthSession",
        next?.user?.id ?? "null"
      );
    }
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    const gen = ++profileLoadGenRef.current;
    setProfileLoading(true);
    setProfileError(null);
    if (__DEV__) {
      console.log("[AuthProvider] profile load start", userId);
    }

    try {
      const result: ProfileLoadResult = await loadProfileForUser(userId);
      if (gen !== profileLoadGenRef.current) return;

      if (result.ok) {
        setProfile(result.profile as AppProfile);
        setRole(result.profile.role as UserRole);
        setProfileError(null);
        if (__DEV__) {
          console.log("[AuthProvider] profile load success", userId);
        }
      } else {
        setProfile(null);
        setRole(null);
        setProfileError(profileErrorMessage(result.error));
        if (__DEV__) {
          console.log("[AuthProvider] profile load failed (result)", result.error);
        }
      }
    } finally {
      if (gen === profileLoadGenRef.current) {
        setProfileLoading(false);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    clearRecoveryFlags();
    profileLoadGenRef.current += 1;
    setProfileLoading(false);
    setIsLoading(true);
    await supabase.auth.signOut();
    lastProfileUserIdRef.current = null;
    applyAuthSession(null);
    setProfile(null);
    setRole(null);
    setProfileError(null);
    setIsLoading((prev) => (prev ? false : prev));
  }, [applyAuthSession, clearRecoveryFlags]);

  /** Clear stored session locally without API call. Use when refresh token is invalid. */
  const clearInvalidSession = useCallback(async () => {
    clearRecoveryFlags();
    profileLoadGenRef.current += 1;
    setProfileLoading(false);
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ignore - we're clearing a broken session
    }
    lastProfileUserIdRef.current = null;
    applyAuthSession(null);
    setProfile(null);
    setRole(null);
    setProfileError(null);
    setIsLoading((prev) => (prev ? false : prev));
  }, [applyAuthSession, clearRecoveryFlags]);

  const isInvalidRefreshTokenError = (err: unknown): boolean =>
    err instanceof AuthApiError &&
    (err.message?.includes("Invalid Refresh Token") ||
      err.message?.includes("Refresh Token Not Found"));

  const retryLoadProfile = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      await loadProfile(user.id);
      setIsLoading((prev) => (prev ? false : prev));
    }
  }, [user, loadProfile]);

  /**
   * Deep links + auth bootstrap + listener. Initial URL is handled before `getSession` so recovery
   * does not load profile and redirect to admin before `update-password`.
   * `onAuthStateChange` is registered only after `init()` completes. `INITIAL_SESSION` is ignored at
   * the subscription callback so bootstrap state is never reapplied.
   */
  useEffect(() => {
    let cancelled = false;

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const recovery = isPasswordRecoveryDeepLink(url);
      const ok = await handleSupabaseAuthUrl(url);

      if (!ok) {
        if (__DEV__ && recovery) {
          console.warn(
            "[Auth deep link] Recovery URL opened but tokens were not applied (check hash, ?code=, or token_hash).",
            "Allowlist should include:",
            PASSWORD_RECOVERY_BRIDGE_URL,
            "and",
            PASSWORD_RECOVERY_APP_URI
          );
        }
        return;
      }

      if (!recovery) return;

      recoveryInProgressRef.current = true;
      setRecoveryInProgress(true);

      const maxAttempts = 15;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        if (s?.user) {
          scheduleRecoveryNav();
          return;
        }
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
      }

      if (__DEV__) {
        console.warn(
          "[Auth deep link] Session not readable after recovery link; PASSWORD_RECOVERY handler should still navigate."
        );
      }
      scheduleRecoveryNav();
    };

    const setBootLoadingFalse = () => {
      if (__DEV__) {
        console.log("[AuthProvider] isLoading → false (bootstrap)");
      }
      setIsLoading((prev) => (prev ? false : prev));
    };

    const init = async () => {
      if (__DEV__) {
        console.log("[AuthProvider] init start");
      }
      let initialSession: Session | null = null;
      try {
        const initialUrl = await Linking.getInitialURL();
        if (!cancelled && initialUrl) {
          await handleUrl(initialUrl);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;

        initialSession = session;
        if (__DEV__) {
          console.log(
            "[AuthProvider] init session result",
            session?.user?.id ?? "no session"
          );
        }

        applyAuthSession(session);

        if (!session?.user) {
          lastProfileUserIdRef.current = null;
          profileLoadGenRef.current += 1;
          setProfileLoading(false);
          setProfile(null);
          setRole(null);
          setProfileError(null);
        }
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          await clearInvalidSession();
          return;
        }
        throw err;
      } finally {
        /* Cancelled or no user: end boot loading. Signed-in: cleared after profile load below. */
        if (cancelled || !initialSession?.user) {
          setBootLoadingFalse();
        }
      }

      if (cancelled) return;

      if (initialSession?.user && !recoveryInProgressRef.current) {
        try {
          await loadProfile(initialSession.user.id);
          lastProfileUserIdRef.current = initialSession.user.id;
        } catch (err) {
          if (isInvalidRefreshTokenError(err)) {
            await clearInvalidSession();
          }
        } finally {
          setBootLoadingFalse();
        }
      } else if (initialSession?.user) {
        /* e.g. recovery: session present but profile intentionally not loaded here */
        setBootLoadingFalse();
      }
    };

    const handleAuthStateChange = async (
      event: AuthChangeEvent,
      nextSession: Session | null
    ) => {
      if (__DEV__) {
        console.log("[AuthProvider] handleAuthStateChange", event);
      }
      try {
        if (event === "PASSWORD_RECOVERY") {
          recoveryInProgressRef.current = true;
          setRecoveryInProgress(true);
          scheduleRecoveryNav();
        }

        applyAuthSession(nextSession);

        if (!nextSession?.user) {
          lastProfileUserIdRef.current = null;
          clearRecoveryFlags();
          profileLoadGenRef.current += 1;
          setProfileLoading(false);
          setProfile(null);
          setRole(null);
          setProfileError(null);
        }
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          await clearInvalidSession();
          return;
        }
        throw err;
      } finally {
        setIsLoading((prev) => (prev ? false : prev));
      }

      if (!nextSession?.user) {
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        return;
      }

      if (recoveryInProgressRef.current || event === "PASSWORD_RECOVERY") {
        return;
      }

      const shouldLoadProfile =
        event === "SIGNED_IN" ||
        nextSession.user.id !== lastProfileUserIdRef.current;

      if (!shouldLoadProfile) {
        return;
      }

      try {
        await loadProfile(nextSession.user.id);
        lastProfileUserIdRef.current = nextSession.user.id;
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          await clearInvalidSession();
        }
      }
    };

    const linkingSub = Linking.addEventListener("url", (event) => {
      void handleUrl(event.url);
    });

    let authSubscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      await init();
      if (cancelled) return;
      // Register only after bootstrap so INITIAL_SESSION from Supabase does not duplicate init().
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === "INITIAL_SESSION") {
          return;
        }
        void handleAuthStateChange(event, session).catch((error) => {
          console.error("[AuthProvider] handleAuthStateChange failed", error);
        });
      });
      if (cancelled) {
        subscription.unsubscribe();
        return;
      }
      authSubscription = subscription;
    })();

    return () => {
      cancelled = true;
      authSubscription?.unsubscribe();
      linkingSub.remove();
    };
  }, [
    applyAuthSession,
    loadProfile,
    clearInvalidSession,
    scheduleRecoveryNav,
    clearRecoveryFlags,
  ]);

  const value: AuthContextValue = {
    user,
    profile,
    role,
    isLoading,
    accessToken: session?.access_token ?? null,
    profileLoading,
    profileError,
    recoveryInProgress,
    signOut,
    retryLoadProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
