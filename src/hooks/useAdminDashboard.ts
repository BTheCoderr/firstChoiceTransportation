import { useState, useCallback, useEffect } from "react";
import {
  getCompanyDriversWithWeeklyStats,
  getRecentCompanyShifts,
  getOpenCompanyShifts,
  type DriverWithWeeklyStats,
  type RecentShiftWithDriver,
} from "@/services/admin";

export interface UseAdminDashboardResult {
  drivers: DriverWithWeeklyStats[];
  recentShifts: RecentShiftWithDriver[];
  openShifts: RecentShiftWithDriver[];
  isLoading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
}

export function useAdminDashboard(companyId: string): UseAdminDashboardResult {
  const [drivers, setDrivers] = useState<DriverWithWeeklyStats[]>([]);
  const [recentShifts, setRecentShifts] = useState<RecentShiftWithDriver[]>([]);
  const [openShifts, setOpenShifts] = useState<RecentShiftWithDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [driversData, shiftsData, openData] = await Promise.all([
        getCompanyDriversWithWeeklyStats(companyId),
        getRecentCompanyShifts(companyId),
        getOpenCompanyShifts(companyId),
      ]);
      setDrivers(driversData);
      setRecentShifts(shiftsData);
      setOpenShifts(openData);
    } catch {
      setLoadError("Could not load administrator data. Refresh before assuming any shift is closed.");
      setDrivers([]);
      setRecentShifts([]);
      setOpenShifts([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { drivers, recentShifts, openShifts, isLoading, loadError, refresh };
}
