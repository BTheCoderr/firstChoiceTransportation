import { supabase } from "@/lib/supabase";
import type { DriverBasesRow } from "@/types/database";
import {
  basesRowsToSettings,
  type DriverBaseSettings,
  resolveDefaultBaseForTravel,
} from "@/types/app";

export async function getBasesForDriver(
  driverId: string
): Promise<DriverBasesRow[]> {
  const { data, error } = await supabase
    .from("driver_bases")
    .select("*")
    .eq("driver_id", driverId)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as DriverBasesRow[];
}

export async function getDriverBaseSettings(
  driverId: string
): Promise<DriverBaseSettings> {
  const bases = await getBasesForDriver(driverId);
  return basesRowsToSettings(bases);
}

/**
 * Row marked `is_default` — used for travel-time to base. No fallback to the other base.
 */
export async function getDefaultBaseForDriver(
  driverId: string
): Promise<DriverBasesRow | null> {
  const settings = await getDriverBaseSettings(driverId);
  const resolved = resolveDefaultBaseForTravel(settings);
  if (!resolved) return null;

  const name = resolved.name;
  const { data, error } = await supabase
    .from("driver_bases")
    .select("*")
    .eq("driver_id", driverId)
    .eq("name", name)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as DriverBasesRow;
}

export interface UpsertNamedBaseInput {
  driverId: string;
  name: "Home" | "Office";
  latitude: number;
  longitude: number;
  address?: string | null;
}

/**
 * Inserts or updates only the named base row. Does not change the other base
 * or which base is default (use setDefaultBaseType for that).
 */
export async function upsertNamedBase(
  input: UpsertNamedBaseInput
): Promise<DriverBasesRow | null> {
  const { driverId, name, latitude, longitude, address } = input;

  const { data: existing } = await supabase
    .from("driver_bases")
    .select("id")
    .eq("driver_id", driverId)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("driver_bases")
      .update({
        latitude,
        longitude,
        address: address ?? null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", (existing as { id: string }).id)
      .select()
      .single();

    if (error || !updated) return null;
    return updated as DriverBasesRow;
  }

  const { data: anyRows } = await supabase
    .from("driver_bases")
    .select("id")
    .eq("driver_id", driverId);

  const isFirstBase = !anyRows?.length;

  const { data: inserted, error } = await supabase
    .from("driver_bases")
    .insert({
      driver_id: driverId,
      name,
      latitude,
      longitude,
      address: address ?? null,
      is_default: isFirstBase,
    } as never)
    .select()
    .single();

  if (error || !inserted) return null;
  return inserted as DriverBasesRow;
}

export type SetDefaultBaseTypeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "MISSING_HOME" | "MISSING_OFFICE" | "UPDATE_FAILED";
    };

/**
 * Sets which base is used for return travel (only toggles `is_default` flags).
 * Requires a saved row with coordinates for that base.
 */
export async function setDefaultBaseType(
  driverId: string,
  baseType: "home" | "office"
): Promise<SetDefaultBaseTypeResult> {
  const name: "Home" | "Office" = baseType === "office" ? "Office" : "Home";

  const { data: target } = await supabase
    .from("driver_bases")
    .select("id")
    .eq("driver_id", driverId)
    .eq("name", name)
    .maybeSingle();

  if (!target) {
    return {
      ok: false,
      reason: baseType === "office" ? "MISSING_OFFICE" : "MISSING_HOME",
    };
  }

  const { error: clearError } = await supabase
    .from("driver_bases")
    .update({ is_default: false } as never)
    .eq("driver_id", driverId);

  if (clearError) return { ok: false, reason: "UPDATE_FAILED" };

  const { error: upError } = await supabase
    .from("driver_bases")
    .update({
      is_default: true,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("driver_id", driverId)
    .eq("name", name);

  if (upError) return { ok: false, reason: "UPDATE_FAILED" };
  return { ok: true };
}

/** @deprecated Use upsertNamedBase — old API also forced that row to be default. */
export async function upsertDefaultBase(
  input: UpsertNamedBaseInput
): Promise<DriverBasesRow | null> {
  return upsertNamedBase(input);
}
