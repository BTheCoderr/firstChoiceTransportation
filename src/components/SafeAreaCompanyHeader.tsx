import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyHeader } from "@/components/CompanyHeader";

/** Aligns custom `headerTitle` with the status bar; stretches for center alignment with `headerRight`. */
export function SafeAreaCompanyHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 4) }]}>
      <CompanyHeader fillNavTitleWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
  },
});
