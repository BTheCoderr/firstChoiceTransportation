import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import {
  adminRootStackScreenOptions,
  adminStackScreenOptions,
} from "@/navigation/adminStackScreenOptions";
import { colors } from "@/theme/spacing";

/**
 * Admin stack only for profile role `admin`. Drivers redirect to `/(driver)`.
 * Stack does not render until auth + profile role are resolved.
 */
export default function AdminLayout() {
  const router = useRouter();
  const { role, isLoading, profileLoading } = useAuth();

  useEffect(() => {
    if (isLoading || profileLoading) return;
    if (role === "driver") {
      router.replace("/(driver)");
      return;
    }
    if (role !== "admin") {
      router.replace("/");
    }
  }, [role, isLoading, profileLoading, router]);

  const showShell =
    !isLoading && !profileLoading && role === "admin";

  if (!showShell) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          ...adminRootStackScreenOptions,
          /** Used as the iOS back label when pushing from the dashboard; avoids "index". */
          title: "Dashboard",
        }}
      />
      <Stack.Screen name="create-driver" options={adminStackScreenOptions} />
      <Stack.Screen name="weekly" options={adminStackScreenOptions} />
      <Stack.Screen name="driver/[id]" options={adminStackScreenOptions} />
      <Stack.Screen name="shift/[id]" options={adminStackScreenOptions} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
