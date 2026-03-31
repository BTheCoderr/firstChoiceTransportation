import { View, Text, StyleSheet } from "react-native";

interface LocationStatusCardProps {
  locationEnabled: boolean;
  trackingActive: boolean;
}

export function LocationStatusCard({
  locationEnabled,
  trackingActive,
}: LocationStatusCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Location status</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Location:</Text>
        <Text
          style={[
            styles.value,
            locationEnabled ? styles.valueSuccess : styles.valueError,
          ]}
        >
          {locationEnabled ? "Enabled" : "Disabled"}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Tracking:</Text>
        <Text
          style={[
            styles.value,
            trackingActive ? styles.valueSuccess : styles.valueMuted,
          ]}
        >
          {trackingActive ? "Active" : "Inactive"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: "#64748b",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  valueSuccess: {
    color: "#059669",
  },
  valueError: {
    color: "#dc2626",
  },
  valueMuted: {
    color: "#94a3b8",
  },
});
