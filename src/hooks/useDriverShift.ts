import { useCallback, useEffect, useRef, useState } from "react";
import type { ShiftsRow } from "@/types/database";
import {
  getActiveShiftForDriver,
  startShift,
  type StartShiftCoords,
} from "@/services/shifts";
import { completeShiftWithFinalDropoff } from "@/services/endShift";
import { stopBackgroundLocationTracking } from "@/services/location";
import type { EndShiftResult } from "@/services/endShift";

const ACTIVE_SHIFT_POLL_INTERVAL_MS = 20_000;

export function useDriverShift(driverId: string | undefined) {
  const [activeShift, setActiveShift] = useState<ShiftsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!driverId) {
      setActiveShift(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const shift = await getActiveShiftForDriver(driverId);
    setActiveShift(shift);
    setIsLoading(false);
  }, [driverId]);

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
      if (!driverId) return { shift: null as ShiftsRow | null, error: null as string | null };
      setIsStarting(true);
      const result = await startShift(driverId, companyId, coords);
      setIsStarting(false);
      if (result.success) {
        setActiveShift(result.shift);
        return { shift: result.shift, error: null };
      }
      const msg =
        result.error === "ALREADY_ACTIVE"
          ? "You already have an active shift."
          : "Could not start shift. Please try again.";
      return { shift: null, error: msg };
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
      const dropoffAt = new Date().toISOString();
      const result = await completeShiftWithFinalDropoff(
        shiftId,
        driverId,
        dropoffLat,
        dropoffLng,
        dropoffAt
      );
      setIsEnding(false);
      if (result.success) {
        await stopBackgroundLocationTracking();
        setActiveShift(null);
      }
      return result;
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
