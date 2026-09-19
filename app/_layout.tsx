import { useMemo } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { iosNativeStackMitigation } from "@/navigation/iosNativeStackOptions";
import { AuthProvider } from "@/providers/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase";
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

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <View style={styles.configError}>
          <Text style={styles.configErrorTitle}>App configuration error</Text>
          <Text style={styles.configErrorText}>
            First Choice Transportation cannot connect to its database because
            the Supabase configuration is missing. Rebuild the app with the
            required environment values before using it.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={rootStackScreenOptions} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  configError: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#f8fafc",
  },
  configErrorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 12,
  },
  configErrorText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#475569",
  },
});
