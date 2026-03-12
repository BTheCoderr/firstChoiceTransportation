import { View, Text, StyleSheet } from "react-native";

interface AdminWeeklySummaryCardProps {
  weekStart: string;
  totalMinutes: number;
  shiftCount: number;
  flaggedCount: number;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatWeekRange(weekStart: string): string {
  try {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  } catch {
    return weekStart;
  }
}

export function AdminWeeklySummaryCard({
  weekStart,
  totalMinutes,
  shiftCount,
  flaggedCount,
}: AdminWeeklySummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>This week</Text>
      <Text style={styles.range}>{formatWeekRange(weekStart)}</Text>
      <View style={styles.stats}>
        <Text style={styles.verified}>
          Verified: {formatMinutes(totalMinutes)}
        </Text>
        <Text style={styles.count}>{shiftCount} shifts</Text>
        {flaggedCount > 0 && (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>{flaggedCount} flagged</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 4,
  },
  range: {
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
  verified: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
  },
  count: {
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
