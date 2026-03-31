import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { mainHeaderScreenOptions } from "@/navigation/mainHeaderOptions";
import { ShiftLocationProvider } from "@/providers/ShiftLocationProvider";
import { colors } from "@/theme/spacing";

/**
 * Driver tabs only for profile role `driver`. Admins redirect to `/(admin)`.
 * Tabs do not render until auth + profile role are resolved (no shell flash).
 */
export default function DriverLayout() {
  const router = useRouter();
  const { role, isLoading, profileLoading } = useAuth();

  useEffect(() => {
    if (isLoading || profileLoading) return;
    if (role === "admin") {
      router.replace("/(admin)");
      return;
    }
    if (role !== "driver") {
      router.replace("/");
    }
  }, [role, isLoading, profileLoading, router]);

  const showShell =
    !isLoading && !profileLoading && role === "driver";

  if (!showShell) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ShiftLocationProvider>
      <Tabs
        screenOptions={{
          ...mainHeaderScreenOptions,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
          }}
        />
        <Tabs.Screen
          name="shift"
          options={{
            title: "Shift",
            tabBarLabel: "Shift",
          }}
        />
        <Tabs.Screen
          name="summary"
          options={{
            title: "Summary",
            tabBarLabel: "Summary",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarLabel: "Profile",
          }}
        />
      </Tabs>
    </ShiftLocationProvider>
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
