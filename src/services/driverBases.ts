import { supabase } from "@/lib/supabase";
import type { DriverBasesRow } from "@/types/database";

export async function getDefaultBaseForDriver(
  driverId: string
): Promise<DriverBasesRow | null> {
  const { data, error } = await supabase
    .from("driver_bases")
    .select("*")
    .eq("driver_id", driverId)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as DriverBasesRow;
}

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

export interface UpsertBaseInput {
  driverId: string;
  name: "Home" | "Office";
  latitude: number;
  longitude: number;
  address?: string | null;
}

export async function upsertDefaultBase(
  input: UpsertBaseInput
): Promise<DriverBasesRow | null> {
  const { driverId, name, latitude, longitude, address } = input;

  const { data: existing } = await supabase
    .from("driver_bases")
    .select("id")
    .eq("driver_id", driverId)
    .eq("name", name)
    .maybeSingle();

  await supabase
    .from("driver_bases")
    .update({ is_default: false } as never)
    .eq("driver_id", driverId);

  if (existing) {
    const { data: updated, error } = await supabase
      .from("driver_bases")
      .update({
        latitude,
        longitude,
        address: address ?? null,
        is_default: true,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", (existing as { id: string }).id)
      .select()
      .single();

    if (error || !updated) return null;
    return updated as DriverBasesRow;
  }

  const { data: inserted, error } = await supabase
    .from("driver_bases")
    .insert({
      driver_id: driverId,
      name,
      latitude,
      longitude,
      address: address ?? null,
      is_default: true,
    } as never)
    .select()
    .single();

  if (error || !inserted) return null;
  return inserted as DriverBasesRow;
}
