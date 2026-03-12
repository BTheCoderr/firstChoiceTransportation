import {
  MOVEMENT_SPEED_THRESHOLD_MS,
  MOVEMENT_DISTANCE_THRESHOLD_M,
} from "@/constants/movement";

/**
 * Haversine distance between two coordinates in meters
 */
export function metersBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if speed exceeds movement threshold.
 * Speed from Expo Location is in m/s.
 */
export function isSpeedAboveThreshold(speedMps: number | null): boolean {
  if (speedMps == null || speedMps < 0) return false;
  return speedMps >= MOVEMENT_SPEED_THRESHOLD_MS;
}

/**
 * Check if distance between two points exceeds movement threshold
 */
export function isDistanceAboveThreshold(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): boolean {
  const dist = metersBetween(lat1, lng1, lat2, lng2);
  return dist >= MOVEMENT_DISTANCE_THRESHOLD_M;
}

export interface PointLike {
  latitude: number;
  longitude: number;
  speed?: number | null;
}

/**
 * True if either speed or distance from prior point indicates meaningful movement
 */
export function isMeaningfulMovement(
  current: PointLike,
  prior: PointLike | null
): boolean {
  if (isSpeedAboveThreshold(current.speed ?? null)) return true;
  if (!prior) return false;
  return isDistanceAboveThreshold(
    prior.latitude,
    prior.longitude,
    current.latitude,
    current.longitude
  );
}

/**
 * Minutes between two ISO timestamps
 */
export function minutesBetween(iso1: string, iso2: string): number {
  const t1 = new Date(iso1).getTime();
  const t2 = new Date(iso2).getTime();
  return Math.abs(t2 - t1) / (60 * 1000);
}
