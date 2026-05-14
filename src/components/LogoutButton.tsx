import { Pressable, StyleSheet } from "react-native";
import { spacing } from "@/theme/spacing";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";

/**
 * Sign out only — route-group layouts redirect to `/(auth)` when `user` is null.
 * Avoids competing `router.replace` calls with layout guards (max update depth).
 */
export function LogoutButton() {
  const { signOut } = useAuth();

  return (
    <Pressable
      style={styles.button}
      onPress={() => void signOut()}
      accessibilityLabel="Log out"
      accessibilityRole="button"
    >
      <Ionicons name="log-out-outline" size={24} color="#2563eb" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
});
