import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radii } from "@/theme/spacing";

export function AutoClockOutCard({ hasApprovedBase, trackingActive }: {
  hasApprovedBase: boolean; trackingActive: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Automatic GPS clock-out</Text>
      <Text style={styles.body}>
        Complete your route and return to your saved Home or Office.
        After GPS confirms you traveled away and stayed at the base for
        about three minutes, your shift closes using your arrival time.
        There is no End Shift button.
      </Text>
      <Text style={styles.note}>
        Keep Always Allow location enabled. Poor GPS or an interrupted
        connection may require your administrator to review your shift.
      </Text>
      {!hasApprovedBase && <Text style={styles.warning}>
        Your administrator must save a Home or Office location first.
      </Text>}
      {!trackingActive && <Text style={styles.warning}>
        GPS tracking is off. Restart tracking or contact your administrator.
      </Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, gap: spacing.sm },
  title: { fontSize: 16, fontWeight: "600", color: colors.text },
  body: { fontSize: 14, lineHeight: 21, color: colors.text },
  note: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  warning: { fontSize: 13, lineHeight: 19, color: "#b45309" },
});
