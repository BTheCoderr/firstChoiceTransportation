import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDriverShift as useDriverShiftHook } from "@/hooks/useDriverShift";

type DriverShiftValue = ReturnType<typeof useDriverShiftHook>;

const DriverShiftContext = createContext<DriverShiftValue | null>(null);

/**
 * Single useDriverShift instance for all driver tabs so ending a shift on the
 * Shift tab updates Home (and vice versa). Without this, each tab kept its own
 * stale activeShift and "Start shift" could stay blocked after a completed shift.
 */
export function DriverShiftProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const value = useDriverShiftHook(profile?.id);
  return (
    <DriverShiftContext.Provider value={value}>
      {children}
    </DriverShiftContext.Provider>
  );
}

export function useDriverShift(): DriverShiftValue {
  const ctx = useContext(DriverShiftContext);
  if (ctx == null) {
    throw new Error(
      "useDriverShift must be used within DriverShiftProvider (driver layout)"
    );
  }
  return ctx;
}
