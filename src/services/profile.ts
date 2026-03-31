import { supabase } from "@/lib/supabase";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import type { ProfilesRow } from "@/types/database";
import type { UserRole } from "@/types/app";

export type ProfileLoadResult =
  | { ok: true; profile: ProfilesRow }
  | { ok: false; error: "PROFILE_MISSING" | "COMPANY_MISMATCH" | "ROLE_MISSING" };

const VALID_ROLES: UserRole[] = ["driver", "admin"];

/**
 * 1. Load profile from profiles table by user id.
 * 2. If missing, try ensure_profile RPC if it exists.
 * 3. Never returns a synthetic profile; returns PROFILE_MISSING if not in DB.
 */
export async function loadProfileForUser(
  userId: string
): Promise<ProfileLoadResult> {
  const { data: directData, error: directError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!directError && directData) {
    const validation = validateProfileForSingleCompany(directData as ProfilesRow);
    if (!validation.ok) return validation;
    return { ok: true, profile: directData as ProfilesRow };
  }

  if (directError?.code !== "PGRST116") {
    return { ok: false, error: "PROFILE_MISSING" };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("ensure_profile");
  const rpcDoesNotExist =
    rpcError?.code === "42883" ||
    rpcError?.message?.toLowerCase().includes("does not exist");

  if (rpcDoesNotExist) {
    return { ok: false, error: "PROFILE_MISSING" };
  }
  if (rpcError) {
    return { ok: false, error: "PROFILE_MISSING" };
  }

  const result = rpcData as { success?: boolean; profile?: ProfilesRow } | null;
  if (!result?.success || !result.profile) {
    return { ok: false, error: "PROFILE_MISSING" };
  }

  const validation = validateProfileForSingleCompany(result.profile as ProfilesRow);
  if (!validation.ok) return validation;
  return { ok: true, profile: result.profile as ProfilesRow };
}

/**
 * Validate profile for single-company MVP: company_id must match, role must be present.
 */
export function validateProfileForSingleCompany(
  profile: ProfilesRow
): ProfileLoadResult {
  if (profile.company_id == null || profile.company_id !== SINGLE_COMPANY_ID) {
    return { ok: false, error: "COMPANY_MISMATCH" };
  }

  const role = profile.role;
  if (
    role == null ||
    typeof role !== "string" ||
    !VALID_ROLES.includes(role as UserRole)
  ) {
    return { ok: false, error: "ROLE_MISSING" };
  }

  return { ok: true, profile };
}

export function profileErrorMessage(
  error: "PROFILE_MISSING" | "COMPANY_MISMATCH" | "ROLE_MISSING"
): string {
  switch (error) {
    case "PROFILE_MISSING":
      return "Your profile could not be loaded. Please contact your administrator.";
    case "COMPANY_MISMATCH":
      return "Your account is not set up for this app. Please contact your administrator.";
    case "ROLE_MISSING":
      return "Your profile is missing a role. Please contact your administrator.";
    default:
      return "Your account could not be loaded. Please contact your administrator.";
  }
}
