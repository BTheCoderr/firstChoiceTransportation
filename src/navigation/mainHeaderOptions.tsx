import { SafeAreaCompanyHeader } from "@/components/SafeAreaCompanyHeader";
import { LogoutButton } from "@/components/LogoutButton";
import { layout, spacing } from "@/theme/spacing";

/**
 * Shared Stack / Tabs header configuration for signed-in areas.
 * Keeps title, safe area, and actions consistent across admin and driver.
 */
export const mainHeaderScreenOptions = {
  headerShown: true as const,
  headerTitle: () => <SafeAreaCompanyHeader />,
  headerRight: () => <LogoutButton />,
  headerTitleAlign: "center" as const,
  headerStyle: {
    backgroundColor: layout.screenBackground,
  },
  headerShadowVisible: false,
  headerTintColor: "#2563eb",
  headerRightContainerStyle: {
    paddingRight: spacing.md,
    minWidth: 44,
  },
  headerLeftContainerStyle: {
    paddingLeft: spacing.md,
  },
};
