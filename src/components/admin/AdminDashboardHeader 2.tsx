import { View, StyleSheet } from "react-native";
import { CompanyHeader } from "@/components/CompanyHeader";
import { AdminDashboardHeaderActions } from "@/components/admin/AdminDashboardHeaderActions";

/**
 * Dashboard-only header: company title on the first row, actions on the second.
 * Avoids cramming title and controls into a single navigation bar row.
 */
export function AdminDashboardHeader() {
  return (
    <View style={styles.root}>
      <View style={styles.titleBlock}>
        <CompanyHeader style={styles.companyHeader} />
      </View>
      <AdminDashboardHeaderActions />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignSelf: "stretch",
    paddingBottom: 4,
  },
  titleBlock: {
    marginBottom: 10,
  },
  companyHeader: {
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
});
