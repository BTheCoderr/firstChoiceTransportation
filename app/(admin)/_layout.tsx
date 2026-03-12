import { Stack } from "expo-router";
import { CompanyHeader } from "@/components/CompanyHeader";
import { LogoutButton } from "@/components/LogoutButton";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: () => <CompanyHeader />,
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Dashboard" }} />
      <Stack.Screen name="driver/[id]" options={{ title: "Driver Detail" }} />
      <Stack.Screen name="shift/[id]" options={{ title: "Shift Detail" }} />
    </Stack>
  );
}
