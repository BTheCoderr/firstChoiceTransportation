import { useEffect, useMemo } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Tabs, usePathname, useRouter, useSegments } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { mainHeaderScreenOptions } from "@/navigation/mainHeaderOptions";
import { ShiftLocationProvider } from "@/providers/ShiftLocationProvider";
import { DriverShiftProvider } from "@/providers/DriverShiftProvider";
import { colors } from "@/theme/spacing";
import {
  pathnameIsRootIndex,
  pathnameMatchesAdmin,
  pathnameMatchesAuth,
} from "@/navigation/routeGuards";

/**
 * Driver tabs only for profile role `driver`. Admins redirect to `/(admin)`.
 * Tabs do not render until auth + profile role are resolved (no shell flash).
 */
export default function DriverLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const segmentKey = segments.join("/");
  const { role, user, isLoading, profileLoading } = useAuth();

  useEffect(() => {
    if (isLoading || profileLoading) return;

    if (role === "admin") {
      if (!pathnameMatchesAdmin(pathname)) router.replace("/(admin)");
      return;
    }
    if (role !== "driver") {
      if (!user) {
        if (!pathnameMatchesAuth(pathname)) router.replace("/(auth)");
      } else if (!pathnameMatchesAuth(pathname) && !pathnameIsRootIndex(pathname)) {
        router.replace("/");
      }
    }
  }, [role, user, isLoading, profileLoading, segmentKey, pathname, router]);

  const tabScreenOptions = useMemo(
    () => ({
      ...mainHeaderScreenOptions,
      freezeOnBlur: false,
    }),
    []
  );

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
      <DriverShiftProvider>
      <Tabs
        detachInactiveScreens={false}
        screenOptions={tabScreenOptions}
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
        <Tabs.Screen
          name="diagnostics"
          options={{
            title: "Diagnostics",
            tabBarLabel: "Diagnostics",
            href: null,
          }}
        />
      </Tabs>
      </DriverShiftProvider>
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
