import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getShiftDetail } from "@/services/admin";
import type { ShiftDetailResult } from "@/services/admin";
import { LocationWithAddress } from "@/components/admin/LocationWithAddress";
import { getMapsDirectionsUrl } from "@/services/geocoding";
import { ScreenContainer, ScreenSection } from "@/components/layout";
import { colors, radii, spacing } from "@/theme/spacing";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
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

function formatSuspiciousReason(reason: string | null): string {
  if (!reason) return "";
  const labels: Record<string, string> = {
    no_movement_within_threshold: "No movement within threshold",
    late_first_movement: "First movement much later than clock-in",
    long_idle_period: "Long idle period during shift",
    extended_shift: "Shift time exceeds reasonable max",
  };
  return labels[reason] ?? reason;
}

export default function AdminShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ShiftDetailResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return null;
    const result = await getShiftDetail(id);
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

  if (!data) {
    return (
      <ScreenContainer
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <Text style={styles.emptyText}>Shift not found.</Text>
      </ScreenContainer>
    );
  }

  const {
    shift,
    driverName,
    driverEmail,
    routePoints,
    routePointsCount,
    clientStopsCount,
  } = data;

  const isFlagged = shift.flagged_at != null;
  const hasSuspicious = shift.suspicious_reason != null;
  const hasDropoff =
    shift.last_dropoff_at != null &&
    shift.last_dropoff_lat != null &&
    shift.last_dropoff_lng != null;

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={[styles.header, isFlagged && styles.headerFlagged]}>
        <Text style={styles.status}>{formatStatus(shift.status)}</Text>
        {isFlagged && (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>Flagged</Text>
          </View>
        )}
      </View>

      <ScreenSection title="Driver">
        <Text style={styles.driverName}>{driverName}</Text>
        <Text style={styles.driverEmail}>{driverEmail}</Text>
      </ScreenSection>

      <ScreenSection title="Times">
        <View style={styles.card}>
          <Text style={styles.row}>
            Clock in: {formatDate(shift.clock_in_at)} at {formatTime(shift.clock_in_at)}
          </Text>
          <Text style={styles.row}>
            Clock out:{" "}
            {shift.clock_out_at
              ? `${formatDate(shift.clock_out_at)} at ${formatTime(shift.clock_out_at)}`
              : "—"}
          </Text>
          <Text style={styles.row}>
            Verified: {formatMinutes(shift.verified_hours_minutes)}
          </Text>
          {shift.first_movement_at && (
            <Text style={styles.row}>
              First movement: {formatTime(shift.first_movement_at)}
            </Text>
          )}
        </View>
      </ScreenSection>

      {hasDropoff && (
        <ScreenSection title="Final dropoff">
          <View style={styles.card}>
            <Text style={styles.row}>
              At: {formatTime(shift.last_dropoff_at!)}
            </Text>
            <LocationWithAddress
              latitude={shift.last_dropoff_lat!}
              longitude={shift.last_dropoff_lng!}
            />
          </View>
        </ScreenSection>
      )}

      <ScreenSection title="Route & stops">
        <View style={styles.card}>
          <Text style={styles.row}>Route points: {routePointsCount}</Text>
          <Text style={styles.row}>Client stops: {clientStopsCount}</Text>
          {routePoints.length > 0 && (
            <Pressable
              style={styles.viewRouteButton}
              onPress={() => {
                const url = getMapsDirectionsUrl(
                  routePoints.map((rp) => ({ lat: rp.latitude, lng: rp.longitude }))
                );
                if (url) Linking.openURL(url);
              }}
            >
              <Text style={styles.viewRouteText}>View full route on map</Text>
            </Pressable>
          )}
        </View>
      </ScreenSection>

      {routePoints.length > 0 && (
        <ScreenSection title="Route points">
          <View style={styles.card}>
            {routePoints.slice(0, 8).map((rp, i) => (
              <LocationWithAddress
                key={rp.id}
                latitude={rp.latitude}
                longitude={rp.longitude}
                timestamp={formatTime(rp.recorded_at)}
                label={`${i + 1}.`}
              />
            ))}
            {routePoints.length > 8 && (
              <Text style={styles.more}>
                +{routePoints.length - 8} more points (use &quot;View full route on map&quot; above)
              </Text>
            )}
          </View>
        </ScreenSection>
      )}

      {hasSuspicious && (
        <ScreenSection title="Suspicious / flagged">
          <View style={[styles.card, styles.suspiciousCard]}>
            {shift.suspicious_reason && (
              <Text style={styles.row}>
                Reason: {formatSuspiciousReason(shift.suspicious_reason)}
              </Text>
            )}
            {shift.flagged_at && (
              <Text style={styles.row}>
                Flagged at: {formatDate(shift.flagged_at)} {formatTime(shift.flagged_at)}
              </Text>
            )}
            {shift.suspicious_details &&
              Object.keys(shift.suspicious_details).length > 0 && (
                <Text style={styles.row}>
                  Details: {JSON.stringify(shift.suspicious_details)}
                </Text>
              )}
          </View>
        </ScreenSection>
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
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sectionGap,
  },
  headerFlagged: {
    padding: spacing.lg,
    backgroundColor: "#fef2f2",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  status: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
  },
  flagBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: "#dc2626",
    borderRadius: spacing.sm,
  },
  flagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  driverName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  driverEmail: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    fontSize: 14,
    color: "#475569",
    marginBottom: spacing.sm,
  },
  viewRouteButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "#eff6ff",
    borderRadius: spacing.sm,
    alignSelf: "flex-start",
  },
  viewRouteText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  more: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
  suspiciousCard: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
});
