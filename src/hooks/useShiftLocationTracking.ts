import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  getForegroundPermissionStatus,
  getBackgroundPermissionStatus,
  requestForegroundPermission,
  requestBackgroundPermission,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isLocationTrackingActive,
} from "@/services/location";
import { TRACKING_SHIFT_ID_KEY } from "@/constants/location";
import * as SecureStore from "expo-secure-store";

export interface UseShiftLocationTrackingResult {
  hasForegroundPermission: boolean;
  hasBackgroundPermission: boolean;
  isTracking: boolean;
  trackingShiftId: string | null;
  isRequestingPermissions: boolean;
  isStarting: boolean;
  startError: string | null;
  requestPermissions: () => Promise<boolean>;
  startTracking: (shiftId: string) => Promise<boolean>;
  stopTracking: () => Promise<void>;
  refreshState: () => Promise<void>;
}

export function useShiftLocationTracking(): UseShiftLocationTrackingResult {
  const [hasForegroundPermission, setHasForegroundPermission] = useState(false);
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingShiftId, setTrackingShiftId] = useState<string | null>(null);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const [foreground, background, active] = await Promise.all([
      getForegroundPermissionStatus(),
      getBackgroundPermissionStatus(),
      isLocationTrackingActive(),
    ]);
    setHasForegroundPermission(foreground);
    setHasBackgroundPermission(background);
    setIsTracking(active);
    if (active) {
      try {
        const sid = await SecureStore.getItemAsync(TRACKING_SHIFT_ID_KEY);
        setTrackingShiftId(sid);
      } catch {
        setTrackingShiftId(null);
      }
    } else {
      setTrackingShiftId(null);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshState();
    });
    return () => sub.remove();
  }, [refreshState]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setIsRequestingPermissions(true);
    setStartError(null);
    try {
      const fg = await getForegroundPermissionStatus();
      if (!fg) {
        const granted = await requestForegroundPermission();
        if (!granted) {
          setStartError("Foreground location permission was denied.");
          setIsRequestingPermissions(false);
          return false;
        }
      }
      const bg = await getBackgroundPermissionStatus();
      if (!bg) {
        const granted = await requestBackgroundPermission();
        if (!granted) {
          setStartError("Background location permission is required for shift tracking.");
          setIsRequestingPermissions(false);
          return false;
        }
      }
      await refreshState();
      return true;
    } finally {
      setIsRequestingPermissions(false);
    }
  }, [refreshState]);

  const startTracking = useCallback(
    async (shiftId: string): Promise<boolean> => {
      setIsStarting(true);
      setStartError(null);
      try {
        const hasFg = await getForegroundPermissionStatus();
        if (!hasFg) {
          const granted = await requestPermissions();
          if (!granted) return false;
        }
        const hasBg = await getBackgroundPermissionStatus();
        if (!hasBg) {
          const granted = await requestPermissions();
          if (!granted) return false;
        }
        const ok = await startBackgroundLocationTracking(shiftId);
        if (ok) {
          await refreshState();
          return true;
        }
        setStartError("Failed to start tracking. Please try again.");
        return false;
      } finally {
        setIsStarting(false);
      }
    },
    [requestPermissions, refreshState]
  );

  const stopTracking = useCallback(async () => {
    await stopBackgroundLocationTracking();
    await refreshState();
  }, [refreshState]);

  return {
    hasForegroundPermission,
    hasBackgroundPermission,
    isTracking,
    trackingShiftId,
    isRequestingPermissions,
    isStarting,
    startError,
    requestPermissions,
    startTracking,
    stopTracking,
    refreshState,
  };
}
