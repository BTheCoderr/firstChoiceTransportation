import { Tabs } from "expo-router";
import { CompanyHeader } from "@/components/CompanyHeader";
import { LogoutButton } from "@/components/LogoutButton";

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => <CompanyHeader />,
        headerRight: () => <LogoutButton />,
        headerRightContainerStyle: { minWidth: 44 },
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
  );
}
