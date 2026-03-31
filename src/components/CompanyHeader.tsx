import { View, Text, Image, StyleSheet } from "react-native";

type CompanyHeaderProps = {
  /**
   * When true, the block stretches to the full nav header width so the company
   * name can wrap and does not compete with headerRight on the same row.
   */
  fillNavTitleWidth?: boolean;
};

export function CompanyHeader({ fillNavTitleWidth = false }: CompanyHeaderProps) {
  return (
    <View style={[styles.container, fillNavTitleWidth && styles.containerFill]}>
      <Image
        source={require("../../assets/first-choice-transportation-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  containerFill: {
    alignSelf: "stretch",
    width: "100%",
    maxWidth: "100%",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 0,
  },
  logo: {
    width: 36,
    height: 36,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  companyNameFill: {
    flex: 1,
    flexShrink: 1,
  },
});
