import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import { useAuth } from "@/hooks/useAuth";
import { useDriverShift } from "@/hooks/useDriverShift";
import { useShiftLocationTracking } from "@/hooks/useShiftLocationTracking";
import { getTodaysLastShiftForDriver } from "@/services/shifts";
import { StartShiftCard } from "@/components/driver/StartShiftCard";
import { ShiftStatusCard } from "@/components/driver/ShiftStatusCard";
import { ShiftSummaryCard } from "@/components/driver/ShiftSummaryCard";
import type { ShiftsRow } from "@/types/database";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DriverHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const driverId = profile?.id;
  const { activeShift, isLoading, isStarting, refresh, startShift } =
    useDriverShift(driverId);
  const { requestPermissions, startTracking } = useShiftLocationTracking();

  const [todaysLastShift, setTodaysLastShift] = useState<ShiftsRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const loadTodaysLastShift = useCallback(async () => {
    if (!driverId) return;
    const shift = await getTodaysLastShiftForDriver(driverId);
    setTodaysLastShift(shift);
  }, [driverId]);

  useEffect(() => {
    if (!activeShift && driverId) {
      loadTodaysLastShift();
    } else {
      setTodaysLastShift(null);
    }
  }, [driverId, activeShift, loadTodaysLastShift]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    await loadTodaysLastShift();
    setRefreshing(false);
  };

  const handleStartShift = async () => {
    if (!driverId) return;
    setStartError(null);
    const { shift, error } = await startShift(SINGLE_COMPANY_ID);
    if (shift) {
      const hasPerms = await requestPermissions();
      if (hasPerms) {
        await startTracking(shift.id);
      }
      router.push("/(driver)/shift");
    } else if (error) {
      setStartError(error);
      if (error.includes("already have an active shift")) {
        await refresh();
      }
    }
  };

  const handleViewShift = () => {
    router.push("/(driver)/shift");
  };

  const firstName = profile?.full_name?.split(" ")[0] ?? "Driver";

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
      <Text style={styles.greeting}>
        {getGreeting()}, {firstName}
      </Text>

      {startError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{startError}</Text>
        </View>
      ) : null}
      {activeShift ? (
        <ShiftStatusCard shift={activeShift} onViewShift={handleViewShift} />
      ) : (
        <StartShiftCard onStartShift={handleStartShift} isStarting={isStarting} />
      )}

      {!activeShift && todaysLastShift && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s last shift</Text>
          <ShiftSummaryCard shift={todaysLastShift} />
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
  greeting: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 24,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#475569",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
  },
});
