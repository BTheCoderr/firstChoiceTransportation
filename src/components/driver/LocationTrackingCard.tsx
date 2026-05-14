import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { getLastRoutePointRecordedAt } from "@/services/routePoints";
import type { UseShiftLocationTrackingResult } from "@/hooks/useShiftLocationTracking";

type TrackingProps = Pick<
  UseShiftLocationTrackingResult,
  | "permissionReady"
  | "foregroundPermission"
  | "hasForegroundPermission"
  | "hasBackgroundPermission"
  | "isTracking"
  | "trackingFlowStatus"
  | "errorMessage"
  | "startTracking"
  | "stopTracking"
>;

interface LocationTrackingCardProps {
  shiftId: string;
  tracking: TrackingProps;
}

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

function formatMinutesAgo(iso: string): string {
  try {
    const d = new Date(iso);
    const min = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (min < 1) return "just now";
    if (min === 1) return "1 min ago";
    return `${min} min ago`;
  } catch {
    return "";
  }
}

function foregroundLabel(
  permissionReady: boolean,
  foregroundPermission: TrackingProps["foregroundPermission"],
  hasForegroundPermission: boolean
): string {
  if (!permissionReady) return "Checking…";
  if (foregroundPermission === "unavailable") return "Unavailable";
  if (foregroundPermission === "denied") return "Denied";
  if (hasForegroundPermission) return "Granted";
  return "Not granted";
}

function backgroundLabel(
  permissionReady: boolean,
  hasBackgroundPermission: boolean
): string {
  if (!permissionReady) return "Checking…";
  return hasBackgroundPermission ? "Granted" : "Not granted";
}

const LAST_POINT_POLL_INTERVAL_MS = 15_000;

export function LocationTrackingCard({
  shiftId,
  tracking,
}: LocationTrackingCardProps) {
  const {
    permissionReady,
    foregroundPermission,
    hasForegroundPermission,
    hasBackgroundPermission,
    isTracking,
    trackingFlowStatus,
    errorMessage,
    startTracking,
    stopTracking,
  } = tracking;

  const [lastRecordedAt, setLastRecordedAt] = useState<string | null>(null);

  const hasAllPermissions = hasForegroundPermission && hasBackgroundPermission;

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const at = await getLastRoutePointRecordedAt(shiftId);
        if (!cancelled) {
          setLastRecordedAt(at);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    if (!isTracking) {
      return () => {
        cancelled = true;
      };
    }
    const id = setInterval(() => void load(), LAST_POINT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [shiftId, isTracking]);

  /**
   * Single entry: startTracking owns permission prompts + native start.
   * Avoids duplicate requestPermissions + startTracking (nested spinners / races).
   */
  const handleStartTracking = async () => {
    await startTracking(shiftId);
  };

  const busy = trackingFlowStatus === "starting";

  const showPermissionHint =
    !isTracking &&
    trackingFlowStatus !== "error" &&
    !busy &&
    permissionReady &&
    foregroundPermission !== "denied" &&
    !hasAllPermissions;

  const buttonLabel = (() => {
    if (trackingFlowStatus === "error") return "Retry";
    if (!hasAllPermissions) return "Request permissions & start tracking";
    return "Start tracking";
  })();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Route tracking</Text>

      {isTracking ? (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>Tracking active</Text>
          <Text style={styles.activeBannerSubtext}>
            Your route is being recorded in the background.
          </Text>
          {lastRecordedAt ? (
            <Text style={styles.lastPointText}>
              Last point: {formatTime(lastRecordedAt)} (
              {formatMinutesAgo(lastRecordedAt)})
            </Text>
          ) : (
            <Text style={styles.lastPointText}>No route points recorded yet.</Text>
          )}
        </View>
      ) : trackingFlowStatus === "error" ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {errorMessage ?? "Could not update tracking. Try again or open Settings."}
          </Text>
          <Text style={styles.errorHint}>
            If background location is off, open Settings and set Location to Always.
          </Text>
          <Pressable style={styles.settingsLink} onPress={openSettings}>
            <Text style={styles.settingsLinkText}>Open Settings</Text>
          </Pressable>
        </View>
      ) : showPermissionHint ? (
        <View style={styles.permissionHint}>
          <Text style={styles.permissionHintText}>
            Route recording needs foreground and background location (Always on iOS).
            Tap the button below to request access.
          </Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Foreground:</Text>
        <Text style={styles.value}>
          {foregroundLabel(
            permissionReady,
            foregroundPermission,
            hasForegroundPermission
          )}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Background:</Text>
        <Text style={styles.value}>
          {backgroundLabel(permissionReady, hasBackgroundPermission)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Tracking:</Text>
        <Text style={[styles.value, isTracking && styles.valueActive]}>
          {isTracking ? "Active" : "Inactive"}
        </Text>
      </View>
      {lastRecordedAt && !isTracking && (
        <View style={styles.row}>
          <Text style={styles.label}>Last point:</Text>
          <Text style={styles.value}>{formatTime(lastRecordedAt)}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {!isTracking ? (
          <Pressable
            style={styles.button}
            onPress={handleStartTracking}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, styles.buttonDanger]}
            onPress={stopTracking}
          >
            <Text style={styles.buttonText}>Stop tracking</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#475569",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#64748b",
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  valueActive: {
    color: "#059669",
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDanger: {
    backgroundColor: "#dc2626",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  activeBanner: {
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  activeBannerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#059669",
  },
  activeBannerSubtext: {
    fontSize: 14,
    color: "#047857",
    marginTop: 4,
  },
  lastPointText: {
    fontSize: 13,
    color: "#047857",
    marginTop: 6,
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
  errorHint: {
    fontSize: 12,
    color: "#b91c1c",
    marginTop: 4,
  },
  settingsLink: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  settingsLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
  },
  permissionHint: {
    backgroundColor: "#fefce8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fef08a",
  },
  permissionHintText: {
    fontSize: 14,
    color: "#854d0e",
  },
});
