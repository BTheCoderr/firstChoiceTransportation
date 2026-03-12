import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/lib/supabase";
import { LOCATION_TASK_NAME, TRACKING_SHIFT_ID_KEY } from "@/constants/location";
import { processMovementUpdate } from "@/services/movement";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error: taskError }) => {
  if (taskError) {
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
      const { error } = await supabase
        .from("route_points")
        .insert({
          shift_id: shiftId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          recorded_at: recordedAt,
          accuracy: loc.coords.accuracy ?? null,
          speed: loc.coords.speed ?? null,
        } as never);

      if (error) {
        continue;
      }

      await processMovementUpdate(shiftId, {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        recorded_at: recordedAt,
        speed: loc.coords.speed ?? null,
      });
    } catch {
      // Avoid crashing on insert or movement update failure
    }
  }
});
