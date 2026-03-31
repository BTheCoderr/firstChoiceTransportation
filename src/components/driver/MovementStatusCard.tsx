import { View, Text, StyleSheet } from "react-native";
import type { ShiftsRow } from "@/types/database";

interface MovementStatusCardProps {
  shift: ShiftsRow;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getStatusLabel(status: ShiftsRow["status"]): string {
  const labels: Record<ShiftsRow["status"], string> = {
    started: "Waiting for movement",
    moving: "Moving",
    idle: "Idle",
    completed: "Completed",
    flagged: "Flagged",
  };
  return labels[status] ?? status;
}

export function MovementStatusCard({ shift }: MovementStatusCardProps) {
  const isMoving = shift.status === "moving";
  const isIdle = shift.status === "idle";
  const hasFirstMovement = shift.first_movement_at != null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Movement status</Text>
      <View style={styles.row}>
        <Text style={styles.label}>State:</Text>
        <Text
          style={[
            styles.value,
            isMoving && styles.valueMoving,
            isIdle && styles.valueIdle,
          ]}
        >
          {getStatusLabel(shift.status)}
        </Text>
      </View>
      {hasFirstMovement && (
        <View style={styles.row}>
          <Text style={styles.label}>First movement:</Text>
          <Text style={styles.value}>{formatTime(shift.first_movement_at!)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#475569",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#64748b",
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  valueMoving: {
    color: "#059669",
  },
  valueIdle: {
    color: "#d97706",
  },
});
