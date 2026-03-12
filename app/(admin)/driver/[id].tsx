import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getDriverDetail } from "@/services/admin";
import type { DriverDetailResult } from "@/services/admin";
import type { ShiftsRow } from "@/types/database";
import { AdminWeeklySummaryCard } from "@/components/admin/AdminWeeklySummaryCard";
import { LocationWithAddress } from "@/components/admin/LocationWithAddress";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.split("T")[0] ?? iso;
  }
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function ShiftRow({
  shift,
  onPress,
}: {
  shift: ShiftsRow;
  onPress: () => void;
}) {
  const isFlagged = shift.flagged_at != null;
  return (
    <Pressable
      style={[styles.shiftRow, isFlagged && styles.shiftRowFlagged]}
      onPress={onPress}
    >
      <View style={styles.shiftRowHeader}>
        <Text style={styles.shiftTime}>
          {formatDate(shift.clock_in_at)} · {formatTime(shift.clock_in_at)} –{" "}
          {shift.clock_out_at ? formatTime(shift.clock_out_at) : "—"}
        </Text>
        {isFlagged && (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>Flagged</Text>
          </View>
        )}
      </View>
      <Text style={styles.shiftVerified}>
        Verified: {formatMinutes(shift.verified_hours_minutes)}
      </Text>
    </Pressable>
  );
}

export default function AdminDriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DriverDetailResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return null;
    const result = await getDriverDetail(id);
    setData(result);
    return result;
  }, [id]);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleShiftPress = (shiftId: string) => {
    router.push(`/(admin)/shift/${shiftId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Driver not found.</Text>
      </View>
    );
  }

  const { profile, defaultBase, recentShifts, weeklyMinutes, weeklyShiftCount, weeklyFlaggedCount, weekStart } = data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.profileSection}>
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        <Text style={styles.role}>Role: {profile.role}</Text>
      </View>

      {defaultBase && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default base</Text>
          <View style={styles.baseCard}>
            <Text style={styles.baseName}>{defaultBase.name}</Text>
            <LocationWithAddress
              latitude={defaultBase.latitude}
              longitude={defaultBase.longitude}
            />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly summary</Text>
        <AdminWeeklySummaryCard
          weekStart={weekStart}
          totalMinutes={weeklyMinutes}
          shiftCount={weeklyShiftCount}
          flaggedCount={weeklyFlaggedCount}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent shifts</Text>
        {recentShifts.length === 0 ? (
          <Text style={styles.placeholder}>No completed shifts yet.</Text>
        ) : (
          recentShifts.map((shift) => (
            <ShiftRow
              key={shift.id}
              shift={shift}
              onPress={() => handleShiftPress(shift.id)}
            />
          ))
        )}
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
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  profileSection: {
    marginBottom: 24,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: "#94a3b8",
    textTransform: "capitalize",
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
  baseCard: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  baseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  shiftRow: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  shiftRowFlagged: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  shiftRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  shiftVerified: {
    fontSize: 14,
    color: "#475569",
  },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#dc2626",
    borderRadius: 6,
  },
  flagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  placeholder: {
    fontSize: 14,
    color: "#94a3b8",
  },
});
