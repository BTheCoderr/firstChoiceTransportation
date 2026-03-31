import { View, StyleSheet } from "react-native";
import { CompanyHeader } from "@/components/CompanyHeader";

/**
 * Center title for admin subpages. Uses the default stack header chrome (back + safe area),
 * so this is only the branded title row — no extra top inset.
 */
export function AdminSubpageHeaderTitle() {
  return (
    <View style={styles.wrap}>
      <CompanyHeader fillNavTitleWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    maxWidth: "100%",
  },
});
