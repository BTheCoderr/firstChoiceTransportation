import { View, Text, Pressable, StyleSheet, Linking, Platform } from "react-native";

interface LocationBlockingBannerProps {
  message: string;
  onRetry: () => void;
}

export function LocationBlockingBanner({ message, onRetry }: LocationBlockingBannerProps) {
  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Location required</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.hint}>
        GPS is required for Start Shift, route tracking, and final dropoff.
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.settingsButton} onPress={openSettings}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#fef2f2",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: "#b91c1c",
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: "#991b1b",
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#dc2626",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  settingsButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  settingsButtonText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
  },
});
