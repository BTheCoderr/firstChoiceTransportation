import { useEffect, useMemo } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import {
  adminRootStackScreenOptions,
  adminStackScreenOptions,
} from "@/navigation/adminStackScreenOptions";
import { iosNativeStackMitigation } from "@/navigation/iosNativeStackOptions";
import { colors } from "@/theme/spacing";
import {
  pathnameIsRootIndex,
  pathnameMatchesAuth,
  pathnameMatchesDriver,
} from "@/navigation/routeGuards";

/**
 * Admin stack only for profile role `admin`. Drivers redirect to `/(driver)`.
 * Stack does not render until auth + profile role are resolved.
 */
export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const segmentKey = segments.join("/");
  const { role, user, isLoading, profileLoading } = useAuth();

  const stackScreenOptions = useMemo(
    () => ({ ...iosNativeStackMitigation }),
    []
  );

  useEffect(() => {
    if (isLoading || profileLoading) return;

    if (role === "driver") {
      if (!pathnameMatchesDriver(pathname)) router.replace("/(driver)");
      return;
    }
    if (role !== "admin") {
      if (!user) {
        if (!pathnameMatchesAuth(pathname)) router.replace("/(auth)");
      } else if (!pathnameMatchesAuth(pathname) && !pathnameIsRootIndex(pathname)) {
        router.replace("/");
      }
    }
  }, [role, user, isLoading, profileLoading, segmentKey, pathname, router]);

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
    <Stack screenOptions={stackScreenOptions}>
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
      <Stack.Screen name="diagnostics" options={adminStackScreenOptions} />
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
