import { useRef, useState } from "react";
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
import { MAX_COMMUTE_ESTIMATE_MINUTES } from "@/services/travelEstimate";

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
  /** Guard against rapid double-taps slipping past the parent isEnding spinner before it propagates. */
  const endInFlightRef = useRef(false);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const handleFinalDropoff = async () => {
    if (endInFlightRef.current) return;
    if (!hasBaseLocation) {
      Alert.alert(
        "Base location required",
        "Your admin must set a home or office base for your account before you can end a shift here."
      );
      return;
    }

    endInFlightRef.current = true;
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
      endInFlightRef.current = false;
      return;
    }

    let result: { success: boolean; error?: string };
    try {
      result = await onFinalDropoff(position.lat, position.lng);
    } catch {
      Alert.alert("Error", "Could not complete shift. Please try again.");
      endInFlightRef.current = false;
      return;
    } finally {
      endInFlightRef.current = false;
    }

    if (!result.success) {
      if (result.error === "NO_BASE") {
        Alert.alert(
          "Base location required",
          "No base location was found for your account. Ask your admin to set your home or office base, then try again."
        );
      } else if (
        result.error === "INVALID_INPUT" ||
        result.error === "INVALID_DROP_OFF_TIME"
      ) {
        Alert.alert(
          "Invalid dropoff details",
          "We couldn't use your GPS or timestamp to finish your shift. Please try again once you have a location fix."
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
      : "End shift";

  const showDeniedHint =
    locationError?.toLowerCase().includes("denied") ||
    locationError?.toLowerCase().includes("settings");

  return (
    <View style={styles.card}>
      <Text style={styles.title}>End shift</Text>
      <Text style={styles.subtitle}>
        Tap the button when you are at your last dropoff. We add one estimated
        drive from this spot to your home or office base so that leg counts
        toward your time—time after you tap does not keep adding. Idling or
        driving around for hours afterward does not add paid time; only that
        single estimate is applied (at most{" "}
        {MAX_COMMUTE_ESTIMATE_MINUTES} minutes).
      </Text>
      {!hasBaseLocation && (
        <Text style={styles.warning}>
          A home or office base must be set by your admin before you can end a
          shift here. You can see your base on the Profile tab once it is set.
        </Text>
      )}
      {locationError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
          <Text style={styles.retryHint}>
            Tap End shift again to retry, or open Settings to enable location.
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
