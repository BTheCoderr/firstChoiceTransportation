import { View, Text, Image, StyleSheet } from "react-native";

export function CompanyHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/first-choice-transportation-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.companyName}>First Choice Transportation</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
});
