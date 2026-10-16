import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { spacing } from "@/theme/spacing";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";

/**
 * Sign out only — route-group layouts redirect to `/(auth)` when `user` is null.
 * Avoids competing `router.replace` calls with layout guards (max update depth).
 */
export function LogoutButton() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } catch {
      Alert.alert("Sign out failed",
        "Your device session could not be cleared. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      style={styles.button}
      onPress={() => { void handleLogout(); }}
      disabled={busy}
      accessibilityLabel="Log out"
      accessibilityRole="button"
    >
      {busy ? <ActivityIndicator color="#2563eb" /> :
        <Ionicons name="log-out-outline" size={24} color="#2563eb" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
});
