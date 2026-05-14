import { metersBetween } from "@/utils/movement";

/** Assumed average speed for travel estimate (m/s). ~25 mph ≈ 11.2 m/s */
const ASSUMED_AVERAGE_SPEED_MS = 11.2;

/**
 * Upper bound on straight-line ETA minutes used for paid return-to-base after final dropoff.
 * Same cap referenced in payroll / suspicious-shift rules docs.
 */
export const MAX_COMMUTE_ESTIMATE_MINUTES = 60;

export interface Coords {
  lat: number;
  lng: number;
}

function isFiniteLatLng(c: Coords): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    Math.abs(c.lat) <= 90 &&
    Math.abs(c.lng) <= 180
  );
}

/**
 * Estimate travel time in minutes from point A to point B.
 * Uses straight-line distance and assumed average speed.
 * Returns null if coordinates are unusable so callers can distinguish from a true 0-minute hop.
 */
export function estimateTravelTimeMinutes(
  from: Coords,
  to: Coords
): number | null {
  if (!isFiniteLatLng(from) || !isFiniteLatLng(to)) return null;
  const distanceM = metersBetween(from.lat, from.lng, to.lat, to.lng);
  if (!Number.isFinite(distanceM) || distanceM < 0) return null;
  const timeSeconds = distanceM / ASSUMED_AVERAGE_SPEED_MS;
  const minutes = Math.ceil(timeSeconds / 60);
  if (!Number.isFinite(minutes)) return null;
  return Math.max(0, minutes);
}
