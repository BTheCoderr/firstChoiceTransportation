import { createContext, useContext, type ReactNode } from "react";
import {
  useShiftLocationTracking,
  type UseShiftLocationTrackingResult,
} from "@/hooks/useShiftLocationTracking";

const ShiftLocationContext =
  createContext<UseShiftLocationTrackingResult | null>(null);

/**
 * Single `useShiftLocationTracking` instance for all driver tabs.
 * Without this, Home + Shift each mount their own hook and state diverges.
 */
export function ShiftLocationProvider({ children }: { children: ReactNode }) {
  const value = useShiftLocationTracking();
  return (
    <ShiftLocationContext.Provider value={value}>
      {children}
    </ShiftLocationContext.Provider>
  );
}

export function useDriverLocation(): UseShiftLocationTrackingResult {
  const ctx = useContext(ShiftLocationContext);
  if (!ctx) {
    throw new Error(
      "useDriverLocation must be used within ShiftLocationProvider"
    );
  }
  return ctx;
}
