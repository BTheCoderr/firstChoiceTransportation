import { View, Text, Pressable, StyleSheet, Linking, Platform } from "react-native";

interface LocationBlockingBannerProps {
  message: string;
  onRetry: () => void;
}

export function LocationBlockingBanner({
  message,
  onRetry,
}: LocationBlockingBannerProps) {
  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Location required to start a shift</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.hint}>
        GPS is required to start a shift, record route verification, and complete
        final dropoff. You can still open other tabs to review summaries and your
        profile.
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

interface LocationUnavailableBannerProps {
  onRetry: () => void;
}

/** Shown when native permission APIs time out — user can still use the app. */
export function LocationUnavailableBanner({
  onRetry,
}: LocationUnavailableBannerProps) {
  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  return (
    <View style={[styles.banner, styles.bannerWarning]}>
      <Text style={styles.titleWarning}>Could not verify location access</Text>
      <Text style={styles.messageWarning}>
        The system did not respond in time. You can keep using the app; try
        Retry or open Settings before starting a shift.
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry check</Text>
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
  bannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  titleWarning: {
    fontSize: 18,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 8,
  },
  messageWarning: {
    fontSize: 15,
    color: "#a16207",
    marginBottom: 16,
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
