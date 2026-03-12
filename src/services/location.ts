import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import {
  LOCATION_TASK_NAME,
  TRACKING_SHIFT_ID_KEY,
  LOCATION_UPDATE_INTERVAL_MS,
  LOCATION_DISTANCE_INTERVAL_M,
} from "@/constants/location";

export async function requestForegroundPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function requestBackgroundPermission(): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === "granted";
}

export async function getForegroundPermissionStatus(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === "granted";
}

export async function getBackgroundPermissionStatus(): Promise<boolean> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status === "granted";
}

export async function startBackgroundLocationTracking(
  shiftId: string
): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(TRACKING_SHIFT_ID_KEY, shiftId);

    const hasForeground = await getForegroundPermissionStatus();
    if (!hasForeground) {
      const granted = await requestForegroundPermission();
      if (!granted) return false;
    }

    const hasBackground = await getBackgroundPermissionStatus();
    if (!hasBackground) {
      const granted = await requestBackgroundPermission();
      if (!granted) return false;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: LOCATION_UPDATE_INTERVAL_MS,
      distanceInterval: LOCATION_DISTANCE_INTERVAL_M,
      foregroundService: {
        notificationTitle: "Shift tracking active",
        notificationBody: "First Choice Transportation is recording your route.",
        notificationColor: "#2563eb",
      },
    });

    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    await SecureStore.deleteItemAsync(TRACKING_SHIFT_ID_KEY);
  } catch {
    // Best effort cleanup
  }
}

export async function isLocationTrackingActive(): Promise<boolean> {
  try {
    const [hasShiftId, hasStarted] = await Promise.all([
      SecureStore.getItemAsync(TRACKING_SHIFT_ID_KEY).then((v) => v != null),
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME),
    ]);
    return hasShiftId && hasStarted;
  } catch {
    return false;
  }
}
