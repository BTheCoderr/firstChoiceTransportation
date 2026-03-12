import { useCallback, useEffect, useState } from "react";
import {
  getForegroundPermissionStatus,
  getBackgroundPermissionStatus,
  requestForegroundPermission,
  requestBackgroundPermission,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isLocationTrackingActive,
} from "@/services/location";

export function useShiftLocationTracking() {
  const [hasForegroundPermission, setHasForegroundPermission] = useState(false);
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  const refreshPermissionState = useCallback(async () => {
    const [fg, bg] = await Promise.all([
      getForegroundPermissionStatus(),
      getBackgroundPermissionStatus(),
    ]);
    setHasForegroundPermission(fg);
    setHasBackgroundPermission(bg);
  }, []);

  const refreshTrackingState = useCallback(async () => {
    const active = await isLocationTrackingActive();
    setIsTracking(active);
  }, []);

  useEffect(() => {
    refreshPermissionState();
    refreshTrackingState();
  }, [refreshPermissionState, refreshTrackingState]);

  const requestPermissions = useCallback(async () => {
    setIsRequestingPermissions(true);
    try {
      const fg = await requestForegroundPermission();
      if (!fg) {
        setIsRequestingPermissions(false);
        await refreshPermissionState();
        return false;
      }
      const bg = await requestBackgroundPermission();
      await refreshPermissionState();
      return bg;
    } finally {
      setIsRequestingPermissions(false);
    }
  }, [refreshPermissionState]);

  const startTracking = useCallback(
    async (shiftId: string) => {
      const started = await startBackgroundLocationTracking(shiftId);
      await refreshTrackingState();
      await refreshPermissionState();
      return started;
    },
    [refreshTrackingState, refreshPermissionState]
  );

  const stopTracking = useCallback(async () => {
    await stopBackgroundLocationTracking();
    await refreshTrackingState();
  }, [refreshTrackingState]);

  return {
    hasForegroundPermission,
    hasBackgroundPermission,
    isTracking,
    isRequestingPermissions,
    requestPermissions,
    startTracking,
    stopTracking,
    refreshPermissionState,
    refreshTrackingState,
  };
}
