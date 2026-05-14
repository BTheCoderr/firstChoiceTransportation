import { useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { spacing } from "@/theme/spacing";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";

/**
 * Sign out only — route-group layouts redirect to `/(auth)` when `user` is null.
 * Avoids competing `router.replace` calls with layout guards (max update depth).
 */
export function LogoutButton() {
  const signingOutRef = useRef(false);
  const { signOut } = useAuth();

  const handlePress = () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    void (async () => {
      try {
        await signOut();
      } finally {
        signingOutRef.current = false;
      }
    })();
  };

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
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
