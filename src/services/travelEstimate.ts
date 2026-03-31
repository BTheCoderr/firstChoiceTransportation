import { metersBetween } from "@/utils/movement";

/** Assumed average speed for travel estimate (m/s). ~25 mph ≈ 11.2 m/s */
const ASSUMED_AVERAGE_SPEED_MS = 11.2;

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Estimate travel time in minutes from point A to point B.
 * Uses straight-line distance and assumed average speed.
 * Can be replaced with Google Maps Directions API later.
 */
export function estimateTravelTimeMinutes(
  from: Coords,
  to: Coords
): number {
  const distanceM = metersBetween(from.lat, from.lng, to.lat, to.lng);
  const timeSeconds = distanceM / ASSUMED_AVERAGE_SPEED_MS;
  return Math.ceil(timeSeconds / 60);
}
