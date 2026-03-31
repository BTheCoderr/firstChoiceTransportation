import { View, StyleSheet } from "react-native";
import { LogoutButton } from "@/components/LogoutButton";
import { AdminSubpageHeaderTitle } from "@/components/admin/AdminSubpageHeaderTitle";
import { colors, layout, spacing } from "@/theme/spacing";

/**
 * Shared native stack header chrome for all admin screens:
 * centered company brand + logout. Matches pushed routes (back chevron from the stack).
 */
const adminHeaderChrome = {
  headerShown: true as const,
  headerTitle: () => <AdminSubpageHeaderTitle />,
  headerRight: () => <LogoutButton />,
  headerTitleAlign: "center" as const,
  /** Chevron-only on iOS when supported; avoids showing the previous route segment (e.g. "index"). */
  headerBackButtonDisplayMode: "minimal" as const,
  headerBackTitle: "Back",
  headerBackTitleVisible: false,
  headerStyle: {
    backgroundColor: layout.screenBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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

/** Create Driver, Weekly, Driver detail, Shift detail — system back + brand + logout. */
export const adminStackScreenOptions = adminHeaderChrome;

/**
 * Admin dashboard (stack root): same bar as subpages, but no back control.
 * Invisible left spacer balances the logout control so the logo stays centered.
 */
export const adminRootStackScreenOptions = {
  ...adminHeaderChrome,
  headerLeft: () => (
    <View
      style={styles.headerBalanceSpacer}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  ),
};

const styles = StyleSheet.create({
  /** ~back chevron control width so title centers like on pushed screens */
  headerBalanceSpacer: {
    width: 56,
    height: 44,
  },
});
