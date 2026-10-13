import { useState, useCallback, useEffect } from "react";
import {
  getCompanyDriversWithWeeklyStats,
  getRecentCompanyShifts,
  getOpenCompanyShifts,
  getPendingCompanyPayrollShifts,
  type DriverWithWeeklyStats,
  type RecentShiftWithDriver,
} from "@/services/admin";

export interface UseAdminDashboardResult {
  drivers: DriverWithWeeklyStats[];
  recentShifts: RecentShiftWithDriver[];
  openShifts: RecentShiftWithDriver[];
  pendingPayrollShifts: RecentShiftWithDriver[];
  isLoading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
}

export function useAdminDashboard(companyId: string): UseAdminDashboardResult {
  const [drivers, setDrivers] = useState<DriverWithWeeklyStats[]>([]);
  const [recentShifts, setRecentShifts] = useState<RecentShiftWithDriver[]>([]);
  const [openShifts, setOpenShifts] = useState<RecentShiftWithDriver[]>([]);
  const [pendingPayrollShifts, setPendingPayrollShifts] = useState<RecentShiftWithDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [driversData, shiftsData, openData, pendingData] = await Promise.all([
        getCompanyDriversWithWeeklyStats(companyId),
        getRecentCompanyShifts(companyId),
        getOpenCompanyShifts(companyId),
        getPendingCompanyPayrollShifts(companyId),
      ]);
      setDrivers(driversData);
      setRecentShifts(shiftsData);
      setOpenShifts(openData);
      setPendingPayrollShifts(pendingData);
    } catch {
      setLoadError("Could not load administrator data. Refresh before assuming any shift is closed.");
      setDrivers([]);
      setRecentShifts([]);
      setOpenShifts([]);
      setPendingPayrollShifts([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { drivers, recentShifts, openShifts, pendingPayrollShifts, isLoading, loadError, refresh };
}
