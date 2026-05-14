import { View, Text, StyleSheet } from "react-native";

type CompanyHeaderProps = {
  /**
   * When true, the block stretches to the full nav header width so the company
   * name can wrap and does not compete with headerRight on the same row.
   */
  fillNavTitleWidth?: boolean;
};

/** Text-only title (logo removed — can reintroduce asset in-app later). */
export function CompanyHeader({ fillNavTitleWidth = false }: CompanyHeaderProps) {
  return (
    <View style={[styles.container, fillNavTitleWidth && styles.containerFill]}>
      <Text
        style={[styles.companyName, fillNavTitleWidth && styles.companyNameFill]}
      >
        First Choice Transportation
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  containerFill: {
    alignSelf: "stretch",
    width: "100%",
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 0,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
  },
  companyNameFill: {
    flex: 1,
    flexShrink: 1,
  },
});
