import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useDriverShift } from "@/hooks/useDriverShift";
import { useDriverLocation } from "@/providers/ShiftLocationProvider";
import { LocationStatusCard } from "@/components/driver/LocationStatusCard";
import { LocationTrackingCard } from "@/components/driver/LocationTrackingCard";
import { MovementStatusCard } from "@/components/driver/MovementStatusCard";
import { FinalDropoffCard } from "@/components/driver/FinalDropoffCard";
import { getDefaultBaseForDriver } from "@/services/driverBases";
import {
  formatDurationMinutes,
  getShiftElapsedMinutes,
} from "@/utils/time";
import { withTimeout } from "@/utils/withTimeout";
import { ScreenContainer, ScreenSection } from "@/components/layout";
import { colors, radii, spacing } from "@/theme/spacing";

const REFRESH_ALL_TIMEOUT_MS = 25_000;

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
  const tracking = useDriverLocation();
  const {
    permissionReady,
    foregroundPermission,
    hasForegroundPermission,
    isTracking,
    trackingFlowStatus,
    startTracking,
    refreshState,
  } = tracking;
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
    try {
      await Promise.race([
        Promise.all([refresh({ silent: true }), refreshState()]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("REFRESH_TIMEOUT")), REFRESH_ALL_TIMEOUT_MS)
        ),
      ]);
      if (profile?.id) {
        const base = await withTimeout(
          getDefaultBaseForDriver(profile.id),
          REFRESH_ALL_TIMEOUT_MS,
          null
        );
        setHasBaseLocation(!!base);
      }
    } catch {
      // ensure spinner clears
    } finally {
      setRefreshing(false);
    }
  };

  const showTrackingStaleWarning = Boolean(
    activeShift &&
      !activeShift.clock_out_at &&
      !isTracking &&
      trackingFlowStatus !== "starting" &&
      trackingFlowStatus !== "error"
  );

  /** Do not treat "unavailable" or "undetermined" as "disabled" — only explicit denied. */
  const showLocationDeniedWarning = Boolean(
    activeShift &&
      !activeShift.clock_out_at &&
      permissionReady &&
      foregroundPermission === "denied"
  );

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
      <ScreenContainer
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </ScreenContainer>
    );
  }

  if (!activeShift) {
    return (
      <ScreenContainer
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <Text style={styles.emptyTitle}>No active shift</Text>
        <Text style={styles.emptyText}>
          Start a shift from the Home screen to continue.
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.statusSection}>
        <LocationStatusCard
          locationEnabled={hasForegroundPermission}
          trackingActive={isTracking}
        />
      </View>
      {showLocationDeniedWarning && (
        <View style={styles.locationDeniedBanner}>
          <Text style={styles.locationDeniedTitle}>Location disabled</Text>
          <Text style={styles.locationDeniedText}>
            Enable location in Settings to record your final dropoff when ending the shift.
          </Text>
        </View>
      )}
      {showTrackingStaleWarning && (
        <View style={styles.trackingWarningBanner}>
          <Text style={styles.trackingWarningTitle}>Route tracking is off</Text>
          <Text style={styles.trackingWarningText}>
            Your route is not being recorded. Tap below to restart tracking.
          </Text>
          <Pressable
            style={styles.trackingWarningButton}
            onPress={() => startTracking(activeShift.id)}
            disabled={trackingFlowStatus === "starting"}
          >
            {trackingFlowStatus === "starting" ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.trackingWarningButtonText}>Restart tracking</Text>
            )}
          </Pressable>
        </View>
      )}
      <ScreenSection title="Shift details">
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
      </ScreenSection>

      <View style={styles.cardBlock}>
        <MovementStatusCard shift={activeShift} />
      </View>

      <View style={styles.cardBlock}>
        <LocationTrackingCard shiftId={activeShift.id} tracking={tracking} />
      </View>

      <View style={styles.cardBlock}>
        <FinalDropoffCard
          onFinalDropoff={handleFinalDropoff}
          isEnding={isEnding}
          hasBaseLocation={hasBaseLocation}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textMuted,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: spacing.sm,
    textAlign: "center",
    color: colors.text,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
  statusSection: {
    marginBottom: spacing.lg,
  },
  duration: {
    fontSize: 18,
    fontWeight: "600",
    color: "#059669",
    marginBottom: spacing.sm,
  },
  detail: {
    fontSize: 15,
    color: "#475569",
    marginBottom: spacing.sm,
  },
  cardBlock: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  locationDeniedBanner: {
    backgroundColor: "#fef2f2",
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  locationDeniedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: spacing.xs,
  },
  locationDeniedText: {
    fontSize: 14,
    color: "#b91c1c",
  },
  trackingWarningBanner: {
    backgroundColor: "#fef3c7",
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  trackingWarningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: spacing.xs,
  },
  trackingWarningText: {
    fontSize: 14,
    color: "#a16207",
    marginBottom: spacing.md,
  },
  trackingWarningButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: "#d97706",
    borderRadius: spacing.sm,
    alignSelf: "flex-start",
  },
  trackingWarningButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
