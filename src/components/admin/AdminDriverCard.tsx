import { View, Text, Pressable, StyleSheet } from "react-native";
import type { AdminDriverListItem } from "@/types/app";

interface AdminDriverCardProps {
  driver: AdminDriverListItem;
  onPress: () => void;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function AdminDriverCard({ driver, onPress }: AdminDriverCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{driver.fullName}</Text>
        <Text style={styles.role}>{driver.role}</Text>
      </View>
      <Text style={styles.email} numberOfLines={1}>
        {driver.email}
      </Text>
      <View style={styles.stats}>
        <Text style={styles.stat}>Weekly: {formatMinutes(driver.weeklyMinutes)}</Text>
        <Text style={styles.stat}>Shifts: {driver.shiftCount}</Text>
        {driver.flaggedCount > 0 && (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>{driver.flaggedCount} flagged</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  role: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "capitalize",
  },
  email: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  stat: {
    fontSize: 14,
    color: "#475569",
  },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fecaca",
    borderRadius: 6,
  },
  flagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dc2626",
  },
});
