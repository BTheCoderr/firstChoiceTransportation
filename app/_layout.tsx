import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/providers/AuthProvider";
// Deferred: backgroundLocationTask is imported in location.ts when tracking starts.
// Importing it at startup can trigger TurboModule crashes on iOS 26.

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { flex: 1, backgroundColor: "#f8fafc" },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
