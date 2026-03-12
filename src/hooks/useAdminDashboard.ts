import { useState, useCallback, useEffect } from "react";
import {
  getCompanyDriversWithWeeklyStats,
  getRecentCompanyShifts,
  type DriverWithWeeklyStats,
  type RecentShiftWithDriver,
} from "@/services/admin";

export interface UseAdminDashboardResult {
  drivers: DriverWithWeeklyStats[];
  recentShifts: RecentShiftWithDriver[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useAdminDashboard(companyId: string): UseAdminDashboardResult {
  const [drivers, setDrivers] = useState<DriverWithWeeklyStats[]>([]);
  const [recentShifts, setRecentShifts] = useState<RecentShiftWithDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [driversData, shiftsData] = await Promise.all([
        getCompanyDriversWithWeeklyStats(companyId),
        getRecentCompanyShifts(companyId),
      ]);
      setDrivers(driversData);
      setRecentShifts(shiftsData);
    } catch {
      setDrivers([]);
      setRecentShifts([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { drivers, recentShifts, isLoading, refresh };
}
