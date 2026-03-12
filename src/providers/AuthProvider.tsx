import React, { createContext, useCallback, useEffect, useState } from "react";
import { InteractionManager } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import type { AppProfile, AuthSessionState, UserRole } from "@/types/app";
import type { ProfilesRow } from "@/types/database";

interface AuthContextValue extends AuthSessionState {
  signOut: () => Promise<void>;
  retryLoadProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(
  userId: string,
  userEmail?: string | null,
  userMetadata?: { full_name?: string } | null
): Promise<ProfilesRow | null> {
  // Try direct select first (faster when profile exists)
  const { data: directData, error: directError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!directError && directData) return directData as ProfilesRow;
  if (directError) {
    console.warn("[AuthProvider] profiles select:", directError.message, directError.code);
  }

  // Fallback: ensure_profile creates profile if missing
  const { data: rpcData, error: rpcError } = await supabase.rpc("ensure_profile");
  if (rpcError) {
    console.warn("[AuthProvider] ensure_profile RPC:", rpcError.message);
  } else {
    const result = rpcData as { success?: boolean; profile?: ProfilesRow } | null;
    if (result?.success && result.profile) {
      return result.profile as ProfilesRow;
    }
  }

  // Last resort: synthetic profile from auth user (unblocks when DB/profile sync is broken)
  // Single-company MVP: all users belong to the one company
  const email = (userEmail ?? "").toLowerCase();
  const role: UserRole = email.includes("admin@") ? "admin" : "driver";
  return {
    id: userId,
    company_id: SINGLE_COMPANY_ID,
    email,
    full_name: userMetadata?.full_name ?? "User",
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as ProfilesRow;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthSessionState["user"]>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string, userEmail?: string | null, userMetadata?: { full_name?: string } | null) => {
      const p = await fetchProfile(userId, userEmail, userMetadata);
      if (p) {
        setProfile(p as AppProfile);
        setRole(p.role as UserRole);
      } else {
        setProfile(null);
        setRole(null);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setIsLoading(false);
  }, []);

  const retryLoadProfile = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      await loadProfile(user.id, user.email, (user as { user_metadata?: { full_name?: string } }).user_metadata);
      setIsLoading(false);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      const init = async () => {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await loadProfile(
            initialSession.user.id,
            initialSession.user.email,
            (initialSession.user as { user_metadata?: { full_name?: string } }).user_metadata
          );
        } else {
          setProfile(null);
          setRole(null);
        }
        setIsLoading(false);
      };

      init();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadProfile(
          session.user.id,
          session.user.email,
          (session.user as { user_metadata?: { full_name?: string } }).user_metadata
        );
      } else {
        setProfile(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      interaction.cancel();
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: AuthContextValue = {
    user,
    profile,
    role,
    isLoading,
    signOut,
    retryLoadProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
