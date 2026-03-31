import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import {
  LOCATION_TASK_NAME,
  TRACKING_SHIFT_ID_KEY,
  LOCATION_UPDATE_INTERVAL_MS,
  LOCATION_DISTANCE_INTERVAL_M,
  LOCATION_REQUEST_TIMEOUT_MS,
  LOCATION_PERMISSION_CHECK_TIMEOUT_MS,
  LOCATION_PERMISSION_DIALOG_TIMEOUT_MS,
  LOCATION_TRACKING_START_TIMEOUT_MS,
  LOCATION_TASK_IMPORT_TIMEOUT_MS,
} from "@/constants/location";

/** Foreground / background permission for UI gating (not raw expo status strings). */
export type PermissionGateState =
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable";

async function racePermission<T>(
  promise: Promise<T>,
  ms: number
): Promise<{ ok: true; value: T } | { ok: false; timedOut: true }> {
  return Promise.race([
    promise.then((value) => ({ ok: true as const, value })),
    new Promise<{ ok: false; timedOut: true }>((resolve) =>
      setTimeout(() => resolve({ ok: false, timedOut: true }), ms)
    ),
  ]);
}

export async function getForegroundPermissionState(): Promise<{
  state: PermissionGateState;
}> {
  const r = await racePermission(
    Location.getForegroundPermissionsAsync(),
    LOCATION_PERMISSION_CHECK_TIMEOUT_MS
  );
  if (!r.ok) {
    return { state: "unavailable" };
  }
  const { status } = r.value;
  if (status === "granted") return { state: "granted" };
  if (status === "denied") return { state: "denied" };
  return { state: "undetermined" };
}

export async function getBackgroundPermissionState(): Promise<{
  state: PermissionGateState;
}> {
  const r = await racePermission(
    Location.getBackgroundPermissionsAsync(),
    LOCATION_PERMISSION_CHECK_TIMEOUT_MS
  );
  if (!r.ok) {
    return { state: "unavailable" };
  }
  const { status } = r.value;
  if (status === "granted") return { state: "granted" };
  if (status === "denied") return { state: "denied" };
  return { state: "undetermined" };
}

export async function requestForegroundPermission(): Promise<boolean> {
  const r = await racePermission(
    Location.requestForegroundPermissionsAsync(),
    LOCATION_PERMISSION_DIALOG_TIMEOUT_MS
  );
  if (!r.ok) {
    return false;
  }
  return r.value.status === "granted";
}

export async function requestBackgroundPermission(): Promise<boolean> {
  const r = await racePermission(
    Location.requestBackgroundPermissionsAsync(),
    LOCATION_PERMISSION_DIALOG_TIMEOUT_MS
  );
  if (!r.ok) {
    return false;
  }
  return r.value.status === "granted";
}

export async function getForegroundPermissionStatus(): Promise<boolean> {
  const { state } = await getForegroundPermissionState();
  return state === "granted";
}

export async function getBackgroundPermissionStatus(): Promise<boolean> {
  const { state } = await getBackgroundPermissionState();
  return state === "granted";
}

export type GetCurrentPositionResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string };

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("LOCATION_TIMEOUT")),
      ms
    );
  });
}

function isLocationUnavailableError(e: unknown): boolean {
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    return (
      msg.includes("location unavailable") ||
      msg.includes("could not get location") ||
      msg.includes("location services")
    );
  }
  return false;
}

export async function getCurrentPosition(): Promise<GetCurrentPositionResult> {
  try {
    const { state: fgState } = await getForegroundPermissionState();
    if (fgState === "denied") {
      return {
        ok: false,
        error:
          "Location permission was denied. Enable it in Settings to continue.",
      };
    }

    if (fgState === "unavailable") {
      return {
        ok: false,
        error:
          "Could not verify location permission. Check Settings or try again.",
      };
    }

    if (fgState === "undetermined") {
      const granted = await requestForegroundPermission();
      if (!granted) {
        return {
          ok: false,
          error:
            "Location permission is required. Please allow access in Settings.",
        };
      }
    }

    const { state: afterState } = await getForegroundPermissionState();
    if (afterState !== "granted") {
      return {
        ok: false,
        error:
          "Location permission was denied. Enable it in Settings to continue.",
      };
    }

    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const location = await Promise.race([
      locationPromise,
      timeoutPromise(LOCATION_REQUEST_TIMEOUT_MS),
    ]);

    const lat = location.coords.latitude;
    const lng = location.coords.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      return {
        ok: false,
        error: "Invalid coordinates received. Please try again.",
      };
    }
    return { ok: true, lat, lng };
  } catch (e) {
    if (e instanceof Error && e.message === "LOCATION_TIMEOUT") {
      return {
        ok: false,
        error:
          "Location request timed out. Move to a place with better GPS signal and try again.",
      };
    }
    if (isLocationUnavailableError(e)) {
      return {
        ok: false,
        error:
          "Location services are unavailable. Turn on Location in Settings and try again.",
      };
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return {
      ok: false,
      error: `Could not get location: ${message}. Please try again.`,
    };
  }
}

/**
 * Starts native background location updates for `shiftId`.
 * Caller must already have granted foreground + background (Always) — e.g. `useShiftLocationTracking`
 * runs `ensureForegroundAndBackgroundForTracking` first. No permission dialogs here (single source of truth).
 */
export async function startBackgroundLocationTracking(
  shiftId: string
): Promise<boolean> {
  try {
    await Promise.race([
      import("@/tasks/backgroundLocationTask"),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("LOCATION_TASK_IMPORT_TIMEOUT")),
          LOCATION_TASK_IMPORT_TIMEOUT_MS
        )
      ),
    ]);

    await SecureStore.setItemAsync(TRACKING_SHIFT_ID_KEY, shiftId);

    const [fg, bg] = await Promise.all([
      getForegroundPermissionState(),
      getBackgroundPermissionState(),
    ]);
    if (fg.state !== "granted" || bg.state !== "granted") {
      try {
        await SecureStore.deleteItemAsync(TRACKING_SHIFT_ID_KEY);
      } catch {
        // best effort — avoid orphaned shift id when we bail before starting updates
      }
      return false;
    }

    await Promise.race([
      Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_UPDATE_INTERVAL_MS,
        distanceInterval: LOCATION_DISTANCE_INTERVAL_M,
        foregroundService: {
          notificationTitle: "Shift tracking active",
          notificationBody:
            "First Choice Transportation is recording your route.",
          notificationColor: "#2563eb",
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("START_LOCATION_UPDATES_TIMEOUT")),
          LOCATION_TRACKING_START_TIMEOUT_MS
        )
      ),
    ]);

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
    const r = await racePermission(
      Promise.all([
        SecureStore.getItemAsync(TRACKING_SHIFT_ID_KEY).then((v) => v != null),
        Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME),
      ]).then(([hasShiftId, hasStarted]) => hasShiftId && hasStarted),
      LOCATION_PERMISSION_CHECK_TIMEOUT_MS
    );
    if (!r.ok) {
      return false;
    }
    return r.value;
  } catch {
    return false;
  }
}
