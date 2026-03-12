import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";

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
  const handleFinalDropoff = async () => {
    if (!hasBaseLocation) {
      Alert.alert(
        "Base location required",
        "Please add a home or office base in the Profile tab to end your shift."
      );
      return;
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (newStatus !== "granted") {
          Alert.alert(
            "Location required",
            "Location access is needed to record your final dropoff position."
          );
          return;
        }
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const result = await onFinalDropoff(
        loc.coords.latitude,
        loc.coords.longitude
      );

      if (!result.success) {
        if (result.error === "NO_BASE") {
          Alert.alert(
            "Base location required",
            "No base location found. Please add a home or office base and try again."
          );
        } else {
          Alert.alert("Error", "Could not complete shift. Please try again.");
        }
      }
    } catch {
      Alert.alert("Error", "Could not get your location. Please try again.");
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Final dropoff</Text>
      <Text style={styles.subtitle}>
        Record your current location as the final dropoff. The shift will end
        after estimated travel time back to your base.
      </Text>
      {!hasBaseLocation && (
        <Text style={styles.warning}>
          Add a base in the Profile tab to use this feature.
        </Text>
      )}
      <Pressable
        style={[
          styles.button,
          (!hasBaseLocation || isEnding) && styles.buttonDisabled,
        ]}
        onPress={handleFinalDropoff}
        disabled={!hasBaseLocation || isEnding}
      >
        {isEnding ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Final Dropoff</Text>
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
