import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import { getCompanyDriversWithWeeklyStats } from "@/services/admin";
import type { DriverWithWeeklyStats } from "@/services/admin";
import { ScreenContainer } from "@/components/layout";
import { colors, radii, spacing } from "@/theme/spacing";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getWeekLabel(weekStart: string): string {
  try {
    const d = new Date(weekStart);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  } catch {
    return weekStart;
  }
}

export default function AdminWeeklyHoursScreen() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<DriverWithWeeklyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getCompanyDriversWithWeeklyStats(SINGLE_COMPANY_ID);
    setDrivers(data);
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDriverPress = (driverId: string) => {
    router.push(`/(admin)/driver/${driverId}`);
  };

  if (isLoading) {
    return (
      <ScreenContainer
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </ScreenContainer>
    );
  }

  const weekLabel =
    drivers.length > 0 ? getWeekLabel(drivers[0].weekStart) : "Current week";

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.weekLabel}>{weekLabel}</Text>
      <Text style={styles.subtitle}>Total verified hours per driver</Text>

      {drivers.length === 0 ? (
        <Text style={styles.empty}>No drivers with shifts this week.</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.cellName]}>Driver</Text>
            <Text style={[styles.cell, styles.cellHours]}>Hours</Text>
            <Text style={[styles.cell, styles.cellShifts]}>Shifts</Text>
            <Text style={[styles.cell, styles.cellFlagged]}>Flagged</Text>
          </View>
          {drivers.map((d) => (
            <Pressable
              key={d.id}
              style={styles.dataRow}
              onPress={() => handleDriverPress(d.id)}
            >
              <Text style={[styles.cell, styles.cellName]} numberOfLines={1}>
                {d.fullName}
              </Text>
              <Text style={[styles.cell, styles.cellHours]}>
                {formatMinutes(d.weeklyMinutes)}
              </Text>
              <Text style={[styles.cell, styles.cellShifts]}>
                {d.shiftCount}
              </Text>
              <Text style={[styles.cell, styles.cellFlagged]}>
                {d.flaggedCount > 0 ? d.flaggedCount : "—"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textMuted,
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  empty: {
    fontSize: 15,
    color: colors.textSubtle,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dataRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cell: {
    fontSize: 14,
  },
  cellName: {
    flex: 2,
    fontWeight: "500",
    color: colors.text,
  },
  cellHours: {
    flex: 1,
    fontWeight: "600",
    color: "#059669",
  },
  cellShifts: {
    flex: 0.6,
    color: "#475569",
  },
  cellFlagged: {
    flex: 0.6,
    color: "#dc2626",
  },
});
