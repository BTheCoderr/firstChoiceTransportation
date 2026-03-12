import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { getRecentShiftsForDriver } from "@/services/shifts";
import { ShiftSummaryCard } from "@/components/driver/ShiftSummaryCard";
import type { ShiftsRow } from "@/types/database";

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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.title}>Recent shifts</Text>
      <Text style={styles.subtitle}>Completed and flagged shifts</Text>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 24,
  },
  empty: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  list: {
    gap: 12,
  },
  cardWrapper: {
    marginBottom: 12,
  },
});
