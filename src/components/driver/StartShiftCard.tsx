import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";

interface StartShiftCardProps {
  onStartShift: () => void;
  isStarting: boolean;
  /** True while fetching GPS before creating the shift */
  isGettingLocation?: boolean;
  /** True only when we know permission was denied (not while still checking). */
  blockStartBecauseLocationDenied?: boolean;
  /** First permission snapshot still in flight */
  locationPermissionPending?: boolean;
}

export function StartShiftCard({
  onStartShift,
  isStarting,
  isGettingLocation = false,
  blockStartBecauseLocationDenied = false,
  locationPermissionPending = false,
}: StartShiftCardProps) {
  const busy = isGettingLocation || isStarting;
  const showSpinner = busy;
  const label = blockStartBecauseLocationDenied
    ? "Location required to start shift"
    : isGettingLocation
      ? "Getting location..."
      : isStarting
        ? "Starting..."
        : "Start Shift";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>No active shift</Text>
      <Text style={styles.subtitle}>Tap below to start your shift</Text>
      {locationPermissionPending ? (
        <Text style={styles.pendingHint}>Checking location access…</Text>
      ) : null}
      <Pressable
        style={[
          styles.button,
          (busy || blockStartBecauseLocationDenied) && styles.buttonDisabled,
        ]}
        onPress={onStartShift}
        disabled={busy || blockStartBecauseLocationDenied}
        accessibilityLabel={
          blockStartBecauseLocationDenied
            ? "Location required to start shift"
            : "Start shift"
        }
      >
        {showSpinner ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </Pressable>
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
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
  },
  pendingHint: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
  },
  button: {
    paddingVertical: 14,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
