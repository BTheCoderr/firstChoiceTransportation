import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useDriverShift } from "@/hooks/useDriverShift";
import { LocationTrackingCard } from "@/components/driver/LocationTrackingCard";
import { MovementStatusCard } from "@/components/driver/MovementStatusCard";
import { FinalDropoffCard } from "@/components/driver/FinalDropoffCard";
import { getDefaultBaseForDriver } from "@/services/driverBases";
import {
  formatDurationMinutes,
  getShiftElapsedMinutes,
} from "@/utils/time";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    started: "Started",
    moving: "Moving",
    idle: "Idle",
    completed: "Completed",
    flagged: "Flagged",
  };
  return labels[status] ?? status;
}

export default function DriverShiftScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const {
    activeShift,
    isLoading,
    isEnding,
    refresh,
    endShift,
  } = useDriverShift(profile?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [hasBaseLocation, setHasBaseLocation] = useState(false);
  const [liveDuration, setLiveDuration] = useState("");

  useEffect(() => {
    if (!activeShift || activeShift.clock_out_at) {
      setLiveDuration("");
      return;
    }
    const update = () =>
      setLiveDuration(
        formatDurationMinutes(getShiftElapsedMinutes(activeShift.clock_in_at))
      );
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [activeShift?.id, activeShift?.clock_in_at, activeShift?.clock_out_at]);

  useEffect(() => {
    if (profile?.id) {
      getDefaultBaseForDriver(profile.id).then((base) =>
        setHasBaseLocation(!!base)
      );
    }
  }, [profile?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    if (profile?.id) {
      const base = await getDefaultBaseForDriver(profile.id);
      setHasBaseLocation(!!base);
    }
    setRefreshing(false);
  };

  const handleFinalDropoff = async (lat: number, lng: number) => {
    if (!activeShift) return { success: false, error: "NO_SHIFT" };
    const result = await endShift(activeShift.id, lat, lng);
    if (result.success) {
      router.replace("/(driver)");
    }
    return {
      success: result.success,
      error: !result.success ? result.error : undefined,
    };
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!activeShift) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyTitle}>No active shift</Text>
        <Text style={styles.emptyText}>
          Start a shift from the Home screen to continue.
        </Text>
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shift details</Text>
        <Text style={styles.duration}>
          {activeShift.clock_out_at
            ? `Duration: ${formatDurationMinutes(activeShift.verified_hours_minutes ?? getShiftElapsedMinutes(activeShift.clock_in_at, activeShift.clock_out_at))}`
            : `Shift running: ${liveDuration || formatDurationMinutes(getShiftElapsedMinutes(activeShift.clock_in_at))}`}
        </Text>
        <Text style={styles.detail}>Started: {formatTime(activeShift.clock_in_at)}</Text>
        <Text style={styles.detail}>Status: {formatStatus(activeShift.status)}</Text>
        {activeShift.start_lat != null && activeShift.start_lng != null && (
          <Text style={styles.detail}>
            Start GPS: {activeShift.start_lat.toFixed(5)}, {activeShift.start_lng.toFixed(5)}
          </Text>
        )}
      </View>

      <View style={styles.placeholder}>
        <MovementStatusCard shift={activeShift} />
      </View>

      <View style={styles.placeholder}>
        <LocationTrackingCard shiftId={activeShift.id} />
      </View>

      <View style={styles.placeholder}>
        <FinalDropoffCard
          onFinalDropoff={handleFinalDropoff}
          isEnding={isEnding}
          hasBaseLocation={hasBaseLocation}
        />
      </View>
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#475569",
  },
  duration: {
    fontSize: 18,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 8,
  },
  detail: {
    fontSize: 24,
    marginBottom: 8,
  },
  placeholder: {
    padding: 24,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 14,
    color: "#94a3b8",
  },
});
