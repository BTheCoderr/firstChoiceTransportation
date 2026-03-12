import { supabase } from "@/lib/supabase";
import type { ShiftsRow } from "@/types/database";
import {
  isMeaningfulMovement,
  minutesBetween,
  type PointLike,
} from "@/utils/movement";
import {
  IDLE_AT_START_THRESHOLD_MINUTES,
  IDLE_AFTER_MOVEMENT_THRESHOLD_MINUTES,
} from "@/constants/movement";
import {
  flagShiftAsSuspicious,
  shouldFlagNoMovement,
  shouldFlagLateFirstMovement,
  shouldFlagLongIdle,
} from "@/services/suspicious";

interface RoutePointRow {
  latitude: number;
  longitude: number;
  recorded_at: string;
  speed: number | null;
}

/**
 * Process a new route point and update shift status (first_movement_at, status).
 * Call after inserting each route point.
 */
export async function processMovementUpdate(
  shiftId: string,
  currentPoint: PointLike & { recorded_at: string }
): Promise<void> {
  try {
    const [{ data: shiftData }, { data: points }] = await Promise.all([
      supabase.from("shifts").select("*").eq("id", shiftId).single(),
      supabase
        .from("route_points")
        .select("latitude, longitude, recorded_at, speed")
        .eq("shift_id", shiftId)
        .order("recorded_at", { ascending: false })
        .limit(5),
    ]);

    const shift = shiftData as ShiftsRow | null;
    if (!shift || !points?.length) return;

    const current: PointLike & { recorded_at: string } = {
      latitude: currentPoint.latitude,
      longitude: currentPoint.longitude,
      speed: currentPoint.speed ?? null,
      recorded_at: currentPoint.recorded_at,
    };

    const priorPoint = points[1] as RoutePointRow | undefined;
    const prior: PointLike | null = priorPoint
      ? {
          latitude: priorPoint.latitude,
          longitude: priorPoint.longitude,
          speed: priorPoint.speed,
        }
      : null;

    const moving = isMeaningfulMovement(current, prior);

    if (moving) {
      const updates: Record<string, unknown> = { status: "moving" };
      if (!shift.first_movement_at) {
        updates.first_movement_at = current.recorded_at;
      }
      await supabase
        .from("shifts")
        .update(updates as never)
        .eq("id", shiftId);
      if (
        !shift.first_movement_at &&
        shouldFlagLateFirstMovement(
          shift.clock_in_at as string,
          current.recorded_at
        )
      ) {
        flagShiftAsSuspicious({
          shiftId,
          reason: "late_first_movement",
          details: {
            clock_in_at: shift.clock_in_at,
            first_movement_at: current.recorded_at,
            minutes_delayed: Math.round(
              minutesBetween(shift.clock_in_at as string, current.recorded_at)
            ),
          },
        }).catch(() => {});
      }
      return;
    }

    // Not moving - check if we should set idle
    const clockInAt = shift.clock_in_at as string;
    const firstMovementAt = shift.first_movement_at as string | null;

    if (!firstMovementAt) {
      const minsSinceClockIn = minutesBetween(clockInAt, current.recorded_at);
      if (minsSinceClockIn >= IDLE_AT_START_THRESHOLD_MINUTES) {
        await supabase
          .from("shifts")
          .update({ status: "idle" } as never)
          .eq("id", shiftId)
          .eq("status", "started");
        if (shouldFlagNoMovement(minsSinceClockIn)) {
          flagShiftAsSuspicious({
            shiftId,
            reason: "no_movement_within_threshold",
            details: {
              clock_in_at: clockInAt,
              minutes_without_movement: Math.round(minsSinceClockIn),
            },
          }).catch(() => {});
        }
      }
      return;
    }

    const lastMovingPoint = findLastMovingPoint(points as RoutePointRow[]);
    if (!lastMovingPoint) return;

    const minsSinceMovement = minutesBetween(
      lastMovingPoint.recorded_at,
      current.recorded_at
    );
    if (minsSinceMovement >= IDLE_AFTER_MOVEMENT_THRESHOLD_MINUTES) {
      await supabase
        .from("shifts")
        .update({ status: "idle" } as never)
        .eq("id", shiftId)
        .eq("status", "moving");
      if (shouldFlagLongIdle(minsSinceMovement)) {
        flagShiftAsSuspicious({
          shiftId,
          reason: "long_idle_period",
          details: {
            last_movement_at: lastMovingPoint.recorded_at,
            idle_minutes: Math.round(minsSinceMovement),
          },
        }).catch(() => {});
      }
    }
  } catch {
    // Avoid crashing - movement update is best-effort
  }
}

function findLastMovingPoint(points: RoutePointRow[]): RoutePointRow | null {
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const prior = points[i + 1];
    const currentLike: PointLike = {
      latitude: current.latitude,
      longitude: current.longitude,
      speed: current.speed,
    };
    const priorLike: PointLike = {
      latitude: prior.latitude,
      longitude: prior.longitude,
      speed: prior.speed,
    };
    if (isMeaningfulMovement(currentLike, priorLike)) {
      return current;
    }
  }
  return null;
}
