import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";

export function LogoutButton() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/(auth)");
    }
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
    padding: 8,
    marginRight: 8,
  },
});
