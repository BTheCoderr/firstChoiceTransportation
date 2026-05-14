import { useMemo } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { iosNativeStackMitigation } from "@/navigation/iosNativeStackOptions";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AuthProvider } from "@/providers/AuthProvider";
// Deferred: backgroundLocationTask is imported in location.ts when tracking starts.
// Importing it at startup can trigger TurboModule crashes on iOS 26.

export default function RootLayout() {
  /** Stable identity: inline `screenOptions` on every Auth re-render can trigger infinite updates in native stack. */
  const rootStackScreenOptions = useMemo(
    () => ({
      ...iosNativeStackMitigation,
      headerShown: false,
      contentStyle: { flex: 1, backgroundColor: "#f8fafc" },
    }),
    []
  );

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={rootStackScreenOptions} />
        </AuthProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
