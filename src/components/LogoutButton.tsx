import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { spacing } from "@/theme/spacing";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";

export function LogoutButton() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [redirectToAuth, setRedirectToAuth] = useState(false);

  useEffect(() => {
    if (!redirectToAuth) return;
    setRedirectToAuth(false);
    router.replace("/(auth)");
  }, [redirectToAuth, router]);

  const handleLogout = async () => {
    await signOut();
    setRedirectToAuth(true);
  };

  return (
    <Pressable
      style={styles.button}
      onPress={handleLogout}
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
