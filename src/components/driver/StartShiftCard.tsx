import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";

interface StartShiftCardProps {
  onStartShift: () => void;
  isStarting: boolean;
}

export function StartShiftCard({ onStartShift, isStarting }: StartShiftCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>No active shift</Text>
      <Text style={styles.subtitle}>Tap below to start your shift</Text>
      <Pressable
        style={[styles.button, isStarting && styles.buttonDisabled]}
        onPress={onStartShift}
        disabled={isStarting}
      >
        {isStarting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Start Shift</Text>
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
