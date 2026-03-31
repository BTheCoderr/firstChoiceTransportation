import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { getRecentShiftsForDriver } from "@/services/shifts";
import { ShiftSummaryCard } from "@/components/driver/ShiftSummaryCard";
import { ScreenContainer, ScreenHeadline, Caption } from "@/components/layout";
import type { ShiftsRow } from "@/types/database";
import { colors, spacing } from "@/theme/spacing";

export default function DriverSummaryScreen() {
  const { profile } = useAuth();
  const driverId = profile?.id;
  const [shifts, setShifts] = useState<ShiftsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadShifts = useCallback(async () => {
    if (!driverId) return;
    const data = await getRecentShiftsForDriver(driverId);
    setShifts(data);
  }, [driverId]);

  useEffect(() => {
    loadShifts().finally(() => setIsLoading(false));
  }, [loadShifts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShifts();
    setRefreshing(false);
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

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <ScreenHeadline style={styles.headlineTight}>Recent shifts</ScreenHeadline>
      <Caption style={styles.subtitle}>Completed and flagged shifts</Caption>

      {shifts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No completed shifts yet</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {shifts.map((shift) => (
            <View key={shift.id} style={styles.cardWrapper}>
              <ShiftSummaryCard shift={shift} />
            </View>
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
  headlineTight: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSubtle,
  },
  list: {
    gap: spacing.cardGap,
  },
  cardWrapper: {
    marginBottom: 0,
  },
});
