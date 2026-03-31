import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { getCurrentPosition } from "@/services/location";

interface FinalDropoffCardProps {
  onFinalDropoff: (
    lat: number,
    lng: number
  ) => Promise<{ success: boolean; error?: string }>;
  isEnding: boolean;
  hasBaseLocation: boolean;
}

export function FinalDropoffCard({
  onFinalDropoff,
  isEnding,
  hasBaseLocation,
}: FinalDropoffCardProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const handleFinalDropoff = async () => {
    if (!hasBaseLocation) {
      Alert.alert(
        "Base location required",
        "Your admin must set a home or office base for your account before you can end a shift here."
      );
      return;
    }

    setLocationError(null);
    setIsGettingLocation(true);
    let position: Awaited<ReturnType<typeof getCurrentPosition>>;
    try {
      position = await getCurrentPosition();
    } finally {
      setIsGettingLocation(false);
    }

    if (!position.ok) {
      setLocationError(position.error);
      return;
    }

    let result: { success: boolean; error?: string };
    try {
      result = await onFinalDropoff(position.lat, position.lng);
    } catch {
      Alert.alert("Error", "Could not complete shift. Please try again.");
      return;
    }

    if (!result.success) {
      if (result.error === "NO_BASE") {
        Alert.alert(
          "Base location required",
          "No base location was found for your account. Ask your admin to set your home or office base, then try again."
        );
      } else {
        Alert.alert("Error", "Could not complete shift. Please try again.");
      }
    }
  };

  const busy = isEnding || isGettingLocation;
  const buttonLabel = isGettingLocation
    ? "Getting location..."
    : isEnding
      ? "Ending shift..."
      : "Final Dropoff";

  const showDeniedHint =
    locationError?.toLowerCase().includes("denied") ||
    locationError?.toLowerCase().includes("settings");

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Final dropoff</Text>
      <Text style={styles.subtitle}>
        Record your current location as the final dropoff. The shift will end
        after estimated travel time back to your base.
      </Text>
      {!hasBaseLocation && (
        <Text style={styles.warning}>
          A home or office base must be set by your admin before you can use Final
          Dropoff. You can see your base on the Profile tab once it is set.
        </Text>
      )}
      {locationError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
          <Text style={styles.retryHint}>
            Tap Final Dropoff again to retry, or open Settings to enable
            location.
          </Text>
          {showDeniedHint ? (
            <Pressable style={styles.settingsLink} onPress={openSettings}>
              <Text style={styles.settingsLinkText}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Pressable
        style={[styles.button, (!hasBaseLocation || busy) && styles.buttonDisabled]}
        onPress={handleFinalDropoff}
        disabled={!hasBaseLocation || busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{buttonLabel}</Text>
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#475569",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  warning: {
    fontSize: 14,
    color: "#d97706",
    marginBottom: 16,
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
  retryHint: {
    fontSize: 13,
    color: "#b91c1c",
    marginTop: 8,
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
  button: {
    paddingVertical: 14,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
