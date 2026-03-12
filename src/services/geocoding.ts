import * as Location from "expo-location";

/**
 * Reverse geocode coordinates to a human-readable address.
 * Returns null if geocoding fails (e.g. no network, rate limit).
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const [result] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    if (!result) return null;

    const parts: string[] = [];
    if (result.streetNumber && result.street) {
      parts.push(`${result.streetNumber} ${result.street}`);
    } else if (result.street) {
      parts.push(result.street);
    } else if (result.name) {
      parts.push(result.name);
    }

    if (result.city) parts.push(result.city);
    if (result.region && result.region !== result.city) parts.push(result.region);
    if (result.postalCode) parts.push(result.postalCode);
    if (result.country) parts.push(result.country);

    return parts.length > 0 ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

export function getMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function getMapsDirectionsUrl(
  waypoints: Array<{ lat: number; lng: number }>
): string {
  if (waypoints.length === 0) return "";
  if (waypoints.length === 1) {
    return getMapsUrl(waypoints[0].lat, waypoints[0].lng);
  }
  // Google Maps dir URL supports ~25 waypoints; sample evenly if more
  const max = 25;
  let toUse = waypoints;
  if (waypoints.length > max) {
    const step = (waypoints.length - 1) / (max - 1);
    toUse = Array.from({ length: max }, (_, i) =>
      waypoints[Math.round(i * step)]
    );
  }
  const points = toUse.map((w) => `${w.lat},${w.lng}`).join("/");
  return `https://www.google.com/maps/dir/${points}`;
}
