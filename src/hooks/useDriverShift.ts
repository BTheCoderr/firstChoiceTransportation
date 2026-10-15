import { useCallback, useEffect, useRef, useState } from "react";
import type { ShiftsRow } from "@/types/database";
import {
  lookupActiveShiftForDriver,
  type ActiveShiftLookup,
  startShift as startShiftService,
  type StartShiftCoords,
  type StartShiftResult,
} from "@/services/shifts";
import { completeShiftWithFinalDropoff } from "@/services/endShift";
import {
  isLocationTrackingActive,
  stopBackgroundLocationTracking,
} from "@/services/location";
import type { EndShiftResult } from "@/services/endShift";
import { withTimeout } from "@/utils/withTimeout";
import { useMountedRef } from "@/hooks/useMountedRef";

const ACTIVE_SHIFT_POLL_INTERVAL_MS = 20_000;
const FETCH_ACTIVE_SHIFT_TIMEOUT_MS = 15_000;
const START_SHIFT_NETWORK_TIMEOUT_MS = 30_000;
const END_SHIFT_NETWORK_TIMEOUT_MS = 45_000;

export function useDriverShift(driverId: string | undefined) {
  const [activeShift, setActiveShift] = useState<ShiftsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { safeSetState } = useMountedRef();

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!driverId) {
        safeSetState(() => {
          setActiveShift(null);
          setIsLoading(false);
        });
        return;
      }
      if (!silent) {
        safeSetState(() => setIsLoading(true));
      }
      try {
        const lookup = await withTimeout(
          lookupActiveShiftForDriver(driverId),
          FETCH_ACTIVE_SHIFT_TIMEOUT_MS,
          { ok: false, shift: null } as ActiveShiftLookup
        );
        // A network failure or timeout is not evidence that the shift ended.
        if (lookup.ok) {
          safeSetState(() => setActiveShift(lookup.shift));
        }
      } finally {
        if (!silent) {
          safeSetState(() => setIsLoading(false));
        }
      }
    },
    [driverId, safeSetState]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!activeShift || !driverId) return;
    pollRef.current = setInterval(() => {
      // Only a successful query confirming no active shift may stop GPS.
      // Suppress transient network errors so a disconnected driver stays tracked.
      void (async () => {
        const lookup = await withTimeout(
          lookupActiveShiftForDriver(driverId),
          FETCH_ACTIVE_SHIFT_TIMEOUT_MS,
          { ok: false, shift: null } as ActiveShiftLookup
        );
        if (!lookup.ok) return;
        if (!lookup.shift) {
          try {
            if (await isLocationTrackingActive()) {
              await stopBackgroundLocationTracking();
            }
          } catch {
            // Best-effort cleanup if the server confirmed clock-out.
          }
        }
        safeSetState(() => setActiveShift(lookup.shift));
      })().catch(() => {});

    }, ACTIVE_SHIFT_POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeShift?.id, driverId, safeSetState]);

  const startShiftAction = useCallback(
    async (companyId: string, coords?: StartShiftCoords) => {
      if (!driverId) {
        return { shift: null as ShiftsRow | null, error: null as string | null };
      }
      safeSetState(() => setIsStarting(true));
      try {
        const result = await withTimeout(
          startShiftService(driverId, companyId, coords),
          START_SHIFT_NETWORK_TIMEOUT_MS,
          { success: false, error: "INSERT_FAILED" } as StartShiftResult
        );
        if (result.success) {
          safeSetState(() => setActiveShift(result.shift));
          return { shift: result.shift, error: null };
        }
        const msg =
          result.error === "ALREADY_ACTIVE"
            ? "You already have an active shift."
            : result.error === "ONBOARDING_REQUIRED"
              ? "Complete your driver profile before clocking in."
              : result.error === "APPROVED_GPS_BASE_REQUIRED"
                ? "Ask your administrator to save your approved Home or Office GPS location."
                : "Could not start shift. Please try again.";
        return { shift: null, error: msg };
      } finally {
        safeSetState(() => setIsStarting(false));
      }
    },
    [driverId, safeSetState]
  );

  const endShift = useCallback(
    async (
      shiftId: string,
      dropoffLat: number,
      dropoffLng: number
    ): Promise<EndShiftResult> => {
      if (!driverId) return { success: false, error: "NO_SHIFT" };
      safeSetState(() => setIsEnding(true));
      try {
        /** Recorded as `last_dropoff_at` — not the same as paid `clock_out_at` (see endShift service). */
        const dropoffAt = new Date().toISOString();
        // Shift locations and employee IDs are private. Avoid writing them to
        // production device logs; preserve only a non-sensitive dev marker.
        if (__DEV__) console.info("[FinalDropoff] completion requested");
        const result = await withTimeout(
          completeShiftWithFinalDropoff(
            shiftId,
            driverId,
            dropoffLat,
            dropoffLng,
            dropoffAt
          ),
          END_SHIFT_NETWORK_TIMEOUT_MS,
          { success: false, error: "UPDATE_FAILED" } as EndShiftResult
        );
        if (result.success) {
          await stopBackgroundLocationTracking();
          safeSetState(() => setActiveShift(null));
        }
        return result;
      } finally {
        safeSetState(() => setIsEnding(false));
      }
    },
    [driverId, safeSetState]
  );

  return {
    activeShift,
    isLoading,
    isStarting,
    isEnding,
    refresh,
    startShift: startShiftAction,
    endShift,
  };
}
