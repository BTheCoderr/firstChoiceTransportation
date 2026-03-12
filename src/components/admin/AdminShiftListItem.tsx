import { View, Text, Pressable, StyleSheet } from "react-native";
import type { ShiftsRow } from "@/types/database";
import type { RecentShiftWithDriver } from "@/services/admin";

interface AdminShiftListItemProps {
  item: RecentShiftWithDriver;
  onPress: () => void;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.split("T")[0] ?? iso;
  }
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function AdminShiftListItem({ item, onPress }: AdminShiftListItemProps) {
  const { shift, driverName } = item;
  const isFlagged = shift.flagged_at != null;

  return (
    <Pressable style={[styles.card, isFlagged && styles.cardFlagged]} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.driver}>{driverName}</Text>
        {isFlagged && (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>Flagged</Text>
          </View>
        )}
      </View>
      <Text style={styles.time}>
        {formatDate(shift.clock_in_at)} · {formatTime(shift.clock_in_at)} –{" "}
        {shift.clock_out_at ? formatTime(shift.clock_out_at) : "—"}
      </Text>
      <Text style={styles.verified}>
        Verified: {formatMinutes(shift.verified_hours_minutes)}
      </Text>
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
  cardFlagged: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  driver: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#dc2626",
    borderRadius: 6,
  },
  flagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  time: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  verified: {
    fontSize: 14,
    color: "#64748b",
  },
});
