import type { RoutePointsRow, ShiftsRow } from "@/types/database";
export type PointEvidence = Pick<RoutePointsRow, "latitude" | "longitude" | "accuracy" | "recorded_at" | "speed">;

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180;
  const phi1 = a.latitude * rad;
  const phi2 = b.latitude * rad;
  const deltaPhi = (b.latitude - a.latitude) * rad;
  const deltaLambda = (b.longitude - a.longitude) * rad;
  const h = Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Warnings for human investigation only. Never use to discipline workers or alter payroll automatically. */
export function assessRouteEvidence(point: PointEvidence, shift?: Pick<ShiftsRow,
  "start_lat" | "start_lng" | "return_base_lat" | "return_base_lng" | "clock_in_at" | "clock_out_at"
>): string[] {
  const warnings: string[] = [];
  const { latitude, longitude } = point;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return ["Invalid GPS coordinates; investigate the raw record."];
  }
  if (point.accuracy != null && (point.accuracy > 200 || point.accuracy < 0))
    warnings.push("Low-confidence GPS accuracy. Verify before relying on this point.");
  // US-regional check for Rhode Island based transportation. Advisory, not a geofence.
  if (!(latitude >= 24 && latitude <= 50 && longitude >= -125 && longitude <= -66))
    warnings.push("Location appears outside the expected US operating region. This can be test or simulated GPS data.");
  const origin = shift?.return_base_lat != null && shift?.return_base_lng != null
    ? { latitude: shift.return_base_lat, longitude: shift.return_base_lng }
    : shift?.start_lat != null && shift?.start_lng != null
      ? { latitude: shift.start_lat, longitude: shift.start_lng } : null;
  if (origin && distanceKm(origin, { latitude, longitude }) > 250)
    warnings.push("This point is more than 250 km from the recorded start or return base.");
  const time = Date.parse(point.recorded_at);
  const start = shift ? Date.parse(shift.clock_in_at) : NaN;
  const end = shift?.clock_out_at ? Date.parse(shift.clock_out_at) : Date.now();
  if (!Number.isFinite(time)) warnings.push("Invalid GPS reading timestamp.");
  else if (Number.isFinite(start) && (time < start - 10 * 60000 || time > end + 10 * 60000))
    warnings.push("GPS reading appears outside the shift time window.");
  if (point.speed != null && point.speed > 60)
    warnings.push("Unusually high reported speed; verify GPS sampling.");
  return warnings;
}
