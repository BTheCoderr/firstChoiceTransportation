import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import {
  LOCATION_TASK_NAME,
  TRACKING_SHIFT_ID_KEY,
  TRACKING_LAST_ERROR_KEY,
} from "@/constants/location";
import { insertRoutePointWithRetry } from "@/services/routePoints";
import { processMovementUpdate } from "@/services/movement";

type TrackingErrorSnapshot = {
  message: string;
  recordedAt: string;
};

async function persistTrackingError(message: string): Promise<void> {
  const snapshot: TrackingErrorSnapshot = {
    message,
    recordedAt: new Date().toISOString(),
  };
  try {
    await SecureStore.setItemAsync(
      TRACKING_LAST_ERROR_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // SecureStore failure must never crash the background task.
  }
}

async function clearTrackingError(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TRACKING_LAST_ERROR_KEY);
  } catch {
    // Best effort only.
  }
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error: taskError }) => {
  if (taskError) {
    await persistTrackingError(
      `Background location task failed: ${taskError.message ?? "unknown error"}`
    );
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] })
    ?.locations;
  if (!locations?.length) return;

  let shiftId: string | null = null;
  try {
    shiftId = await SecureStore.getItemAsync(TRACKING_SHIFT_ID_KEY);
  } catch {
    return;
  }

  if (!shiftId) return;

  for (const loc of locations) {
    try {
      const recordedAt = new Date(loc.timestamp).toISOString();
      const inserted = await insertRoutePointWithRetry({
        shift_id: shiftId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        recorded_at: recordedAt,
        accuracy: loc.coords.accuracy ?? null,
        speed: loc.coords.speed ?? null,
      });

      if (!inserted) {
        await persistTrackingError(
          "Route tracking is running, but a location point could not be uploaded after retries. Check your connection."
        );
        continue;
      }

      // A successful upload proves the pipeline recovered.
      await clearTrackingError();

      await processMovementUpdate(shiftId, {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        recorded_at: recordedAt,
        speed: loc.coords.speed ?? null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown background tracking error";
      await persistTrackingError(
        `Route tracking encountered an error: ${message}`
      );
    }
  }
});
