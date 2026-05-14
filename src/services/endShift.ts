import { supabase } from "@/lib/supabase";
import { getDefaultBaseForDriver } from "@/services/driverBases";
import {
  estimateTravelTimeMinutes,
  MAX_COMMUTE_ESTIMATE_MINUTES,
} from "@/services/travelEstimate";
import { shouldFlagExtendedShift } from "@/services/suspicious";
import type { ShiftsRow } from "@/types/database";

/** Structured logs for device / Metro debugging (Option B final dropoff). */
function logFinalDropoff(
  payload: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
): void {
  const line = `[FinalDropoff] ${JSON.stringify(payload)}`;
  if (level === "warn") console.warn(line);
  else if (level === "error") console.error(line);
  else console.info(line);
}

function returnBaseSemanticType(baseName: string): "home" | "office" {
  return baseName.trim().toLowerCase() === "office" ? "office" : "home";
}

function isFiniteLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export type EndShiftResult =
  | { success: true; shift: ShiftsRow }
  | {
      success: false;
      error:
        | "NO_BASE"
        | "NO_SHIFT"
        | "UPDATE_FAILED"
        /** Invalid GPS or base coordinates */
        | "INVALID_INPUT"
        /** Unparsable dropoff timestamp from client */
        | "INVALID_DROP_OFF_TIME";
    };

/**
 * Option B — Final dropoff is NOT immediate clock-out at tap time.
 *
 * 1. `dropoffAt` + dropoff GPS are stored as last_dropoff_* (last client work).
 * 2. Default base from `getDefaultBaseForDriver`.
 * 3. ETA minutes = straight-line estimate dropoff→base (null → 0 applied + audit detail).
 * 4. `clock_out_at` = `last_dropoff_at` + capped applied minutes.
 * 5. `verified_hours_minutes` = floor(clock_out − clock_in) in minutes (includes return travel).
 * 6. Persists audit: estimated_return_minutes, return_base_*.
 * 7. Status usually `completed`; may be `flagged` if total verified time exceeds policy max.
 */
export async function completeShiftWithFinalDropoff(
  shiftId: string,
  driverId: string,
  dropoffLat: number,
  dropoffLng: number,
  dropoffAt: string
): Promise<EndShiftResult> {
  const dropoffDate = new Date(dropoffAt);
  if (Number.isNaN(dropoffDate.getTime())) {
    logFinalDropoff(
      {
        event: "invalid_drop_off_time",
        shiftId,
        driverId,
        dropoffAt,
      },
      "warn"
    );
    return { success: false, error: "INVALID_DROP_OFF_TIME" };
  }

  // Uses only the driver's configured default base (Home or Office). No fallback.
  const base = await getDefaultBaseForDriver(driverId);
  if (!base) {
    logFinalDropoff(
      { event: "no_default_base", shiftId, driverId, dropoffAt },
      "warn"
    );
    return { success: false, error: "NO_BASE" };
  }

  if (
    !isFiniteLatLng(dropoffLat, dropoffLng) ||
    !isFiniteLatLng(base.latitude, base.longitude)
  ) {
    logFinalDropoff(
      {
        event: "invalid_coordinates",
        shiftId,
        driverId,
        dropoffLat,
        dropoffLng,
        baseLat: base.latitude,
        baseLng: base.longitude,
      },
      "warn"
    );
    return { success: false, error: "INVALID_INPUT" };
  }

  const { data: shiftData, error: fetchError } = await supabase
    .from("shifts")
    .select("*")
    .eq("id", shiftId)
    .eq("driver_id", driverId)
    .in("status", ["started", "moving", "idle"])
    .is("clock_out_at", null)
    .single();

  const shift = shiftData as ShiftsRow | null;
  if (fetchError || !shift) {
    logFinalDropoff(
      {
        event: "shift_not_loaded",
        shiftId,
        driverId,
        fetchErrorMessage:
          fetchError != null
            ? "message" in fetchError &&
              typeof (fetchError as { message?: string }).message === "string"
              ? (fetchError as { message: string }).message
              : JSON.stringify(fetchError)
            : !shift
              ? "no_row"
              : "unknown",
      },
      "warn"
    );
    return { success: false, error: "NO_SHIFT" };
  }

  const rawReturnMinutes = estimateTravelTimeMinutes(
    { lat: dropoffLat, lng: dropoffLng },
    { lat: base.latitude, lng: base.longitude }
  );

  /** True when geometry could not produce a trustworthy ETA — still complete shift with 0 paid return minutes. */
  const returnEtaUnavailable = rawReturnMinutes === null;

  if (returnEtaUnavailable) {
    logFinalDropoff(
      {
        event: "return_eta_unavailable_using_zero",
        shiftId,
        driverId,
        dropoffAt,
      },
      "warn"
    );
  }

  /** Minutes actually added to `last_dropoff_at` for paid clock-out (capped). */
  const appliedReturnMinutes = Math.min(
    rawReturnMinutes ?? 0,
    MAX_COMMUTE_ESTIMATE_MINUTES
  );

  const endDate = new Date(
    dropoffDate.getTime() + appliedReturnMinutes * 60 * 1000
  );
  /** Paid clock-out — last_dropoff instant + applied return ETA, never “tap now” alone. */
  const clockOutAt = endDate.toISOString();

  const clockInAt = new Date(shift.clock_in_at as string);
  const verifiedMinutes = Math.floor(
    (endDate.getTime() - clockInAt.getTime()) / (60 * 1000)
  );

  const isExtended = shouldFlagExtendedShift(verifiedMinutes);

  /** Admin audit: geometric ETA before payroll cap — when raw exceeds cap or shift is flagged. */
  const includeUncappedMinutes =
    rawReturnMinutes !== null &&
    (rawReturnMinutes > appliedReturnMinutes || isExtended);

  /** Merge with whatever the live shift already has so we never wipe prior admin/audit context. */
  const priorSuspicionDetails =
    shift.suspicious_details &&
    typeof shift.suspicious_details === "object" &&
    !Array.isArray(shift.suspicious_details)
      ? (shift.suspicious_details as Record<string, unknown>)
      : {};

  const suspicionDetails: Record<string, unknown> = {
    ...priorSuspicionDetails,
    ...(isExtended ? { verified_minutes: verifiedMinutes as number } : {}),
    ...(returnEtaUnavailable ? { return_eta_unavailable: true as const } : {}),
    ...(includeUncappedMinutes && rawReturnMinutes !== null
      ? { return_commute_uncapped_minutes: rawReturnMinutes }
      : {}),
  };

  logFinalDropoff({
    event: "computed_paid_clock_out",
    shiftId,
    driverId,
    dropoffAt,
    dropoffLat,
    dropoffLng,
    baseLatitude: base.latitude,
    baseLongitude: base.longitude,
    rawReturnMinutes,
    cappedAt: MAX_COMMUTE_ESTIMATE_MINUTES,
    appliedReturnMinutes,
    clockOutAt,
    verifiedMinutes,
    status: isExtended ? "flagged" : "completed",
    suspiciousDetailsKeys: Object.keys(suspicionDetails),
  });

  const updatePayload = {
    last_dropoff_at: dropoffAt,
    last_dropoff_lat: dropoffLat,
    last_dropoff_lng: dropoffLng,
    estimated_return_minutes: appliedReturnMinutes,
    return_base_lat: base.latitude,
    return_base_lng: base.longitude,
    return_base_type: returnBaseSemanticType(base.name),
    return_base_address: base.address ?? null,
    clock_out_at: clockOutAt,
    auto_end_at: clockOutAt,
    verified_hours_minutes: verifiedMinutes,
    status: isExtended ? ("flagged" as const) : ("completed" as const),
    ...(Object.keys(suspicionDetails).length > 0
      ? { suspicious_details: suspicionDetails }
      : {}),
    /** Preserve any existing flag (e.g. set by admin or earlier suspicious_route detection). */
    ...(isExtended && !shift.suspicious_reason
      ? {
          suspicious_reason: "extended_shift" as const,
        }
      : {}),
    ...(isExtended && !shift.flagged_at
      ? { flagged_at: new Date().toISOString() }
      : {}),
  };

  const { data: updated, error: updateError } = await supabase
    .from("shifts")
    .update(updatePayload as never)
    .eq("id", shiftId)
    .select()
    .single();

  if (updateError || !updated) {
    logFinalDropoff(
      {
        event: "supabase_update_failed",
        shiftId,
        driverId,
        message: updateError?.message ?? "no_updated_row",
      },
      "error"
    );
    return { success: false, error: "UPDATE_FAILED" };
  }

  logFinalDropoff({
    event: "update_success",
    shiftId,
    driverId,
    clockOutAt,
    verifiedMinutes,
    estimatedReturnMinutes: appliedReturnMinutes,
  });

  return { success: true, shift: updated as ShiftsRow };
}
