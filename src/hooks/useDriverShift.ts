import { useCallback, useEffect, useRef, useState } from "react";
import type { ShiftsRow } from "@/types/database";
import {
  getActiveShiftForDriver,
  startShift as startShiftService,
  type StartShiftCoords,
  type StartShiftResult,
} from "@/services/shifts";
import { completeShiftWithFinalDropoff } from "@/services/endShift";
import { stopBackgroundLocationTracking } from "@/services/location";
import type { EndShiftResult } from "@/services/endShift";
import { withTimeout } from "@/utils/withTimeout";

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

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!driverId) {
        setActiveShift(null);
        setIsLoading(false);
        return;
      }
      if (!silent) {
        setIsLoading(true);
      }
      try {
        const shift = await withTimeout(
          getActiveShiftForDriver(driverId),
          FETCH_ACTIVE_SHIFT_TIMEOUT_MS,
          null as ShiftsRow | null
        );
        setActiveShift(shift);
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [driverId]
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
      getActiveShiftForDriver(driverId).then((shift) => {
        setActiveShift(shift);
      });
    }, ACTIVE_SHIFT_POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeShift?.id, driverId]);

  const startShiftAction = useCallback(
    async (companyId: string, coords?: StartShiftCoords) => {
      if (!driverId) {
        return { shift: null as ShiftsRow | null, error: null as string | null };
      }
      setIsStarting(true);
      try {
        const result = await withTimeout(
          startShiftService(driverId, companyId, coords),
          START_SHIFT_NETWORK_TIMEOUT_MS,
          { success: false, error: "INSERT_FAILED" } as StartShiftResult
        );
        if (result.success) {
          setActiveShift(result.shift);
          return { shift: result.shift, error: null };
        }
        const msg =
          result.error === "ALREADY_ACTIVE"
            ? "You already have an active shift."
            : "Could not start shift. Please try again.";
        return { shift: null, error: msg };
      } finally {
        setIsStarting(false);
      }
    },
    [driverId]
  );

  const endShift = useCallback(
    async (
      shiftId: string,
      dropoffLat: number,
      dropoffLng: number
    ): Promise<EndShiftResult> => {
      if (!driverId) return { success: false, error: "NO_SHIFT" };
      setIsEnding(true);
      try {
        const dropoffAt = new Date().toISOString();
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
          setActiveShift(null);
        }
        return result;
      } finally {
        setIsEnding(false);
      }
    },
    [driverId]
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
