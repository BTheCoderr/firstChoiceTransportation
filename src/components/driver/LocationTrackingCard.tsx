import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useShiftLocationTracking } from "@/hooks/useShiftLocationTracking";

interface LocationTrackingCardProps {
  shiftId: string;
}

export function LocationTrackingCard({ shiftId }: LocationTrackingCardProps) {
  const {
    hasForegroundPermission,
    hasBackgroundPermission,
    isTracking,
    isRequestingPermissions,
    isStarting,
    startError,
    requestPermissions,
    startTracking,
    stopTracking,
  } = useShiftLocationTracking();
  const hasAutoStarted = useRef(false);

  const hasAllPermissions = hasForegroundPermission && hasBackgroundPermission;

  useEffect(() => {
    if (isTracking || isStarting || isRequestingPermissions) return;
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    const run = async () => {
      const ok = await startTracking(shiftId);
      if (!ok) hasAutoStarted.current = false;
    };
    run();
  }, [shiftId, isTracking, isStarting, isRequestingPermissions, startTracking]);

  const handleStartTracking = async () => {
    if (!hasAllPermissions) {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    hasAutoStarted.current = true;
    await startTracking(shiftId);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Route tracking</Text>

      {isTracking ? (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>Tracking active</Text>
          <Text style={styles.activeBannerSubtext}>
            Your route is being recorded in the background.
          </Text>
        </View>
      ) : startError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{startError}</Text>
          <Text style={styles.errorHint}>
            Tap Retry below after granting permissions in Settings.
          </Text>
        </View>
      ) : !hasAllPermissions && !isRequestingPermissions && !isStarting ? (
        <View style={styles.permissionHint}>
          <Text style={styles.permissionHintText}>
            Location permissions are required to record your route during the shift.
          </Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Foreground:</Text>
        <Text style={styles.value}>
          {hasForegroundPermission ? "Granted" : "Not granted"}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Background:</Text>
        <Text style={styles.value}>
          {hasBackgroundPermission ? "Granted" : "Not granted"}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Tracking:</Text>
        <Text style={[styles.value, isTracking && styles.valueActive]}>
          {isTracking ? "Active" : "Inactive"}
        </Text>
      </View>

      <View style={styles.actions}>
        {!isTracking ? (
          <Pressable
            style={styles.button}
            onPress={handleStartTracking}
            disabled={isRequestingPermissions || isStarting}
          >
            {isRequestingPermissions || isStarting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {!hasAllPermissions
                  ? "Request permissions & start"
                  : startError
                    ? "Retry"
                    : "Start tracking"}
              </Text>
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
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  buttonDanger: {
    backgroundColor: "#dc2626",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: "#2563eb",
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
