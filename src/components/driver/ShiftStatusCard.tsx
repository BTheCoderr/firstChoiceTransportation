import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { ShiftsRow } from "@/types/database";
import {
  formatDurationMinutes,
  getShiftElapsedMinutes,
} from "@/utils/time";

interface ShiftStatusCardProps {
  shift: ShiftsRow;
  onViewShift: () => void;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatStatus(status: ShiftsRow["status"]): string {
  const labels: Record<ShiftsRow["status"], string> = {
    started: "Started",
    moving: "Moving",
    idle: "Idle",
    completed: "Completed",
    flagged: "Flagged",
  };
  return labels[status] ?? status;
}

const ACTIVE_STATUSES = ["started", "moving", "idle"] as const;

export function ShiftStatusCard({ shift, onViewShift }: ShiftStatusCardProps) {
  const isMoving = shift.status === "moving";
  const isIdle = shift.status === "idle";
  const isActive = ACTIVE_STATUSES.includes(shift.status as (typeof ACTIVE_STATUSES)[number]);

  const [durationDisplay, setDurationDisplay] = useState(() => {
    if (shift.verified_hours_minutes != null && !isActive) {
      return formatDurationMinutes(shift.verified_hours_minutes);
    }
    return formatDurationMinutes(
      getShiftElapsedMinutes(shift.clock_in_at, shift.clock_out_at)
    );
  });

  useEffect(() => {
    if (!isActive) return;
    const update = () => {
      setDurationDisplay(
        formatDurationMinutes(
          getShiftElapsedMinutes(shift.clock_in_at, shift.clock_out_at)
        )
      );
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [shift.clock_in_at, shift.clock_out_at, isActive]);

  return (
    <View style={styles.card}>
      <Text style={styles.badge}>Active</Text>
      <Text style={styles.title}>Shift in progress</Text>
      <Text style={styles.duration}>Shift running: {durationDisplay}</Text>
      <Text style={styles.time}>Started at {formatTime(shift.clock_in_at)}</Text>
      <Text
        style={[
          styles.status,
          isMoving && styles.statusMoving,
          isIdle && styles.statusIdle,
        ]}
      >
        {formatStatus(shift.status)}
      </Text>
      {shift.first_movement_at != null && (
        <Text style={styles.firstMovement}>
          First movement: {formatTime(shift.first_movement_at)}
        </Text>
      )}
      {shift.start_lat != null && shift.start_lng != null && (
        <Text style={styles.coords}>
          Start: {shift.start_lat.toFixed(5)}, {shift.start_lng.toFixed(5)}
        </Text>
      )}
      <Pressable style={styles.button} onPress={onViewShift}>
        <Text style={styles.buttonText}>View Shift</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  duration: {
    fontSize: 20,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 4,
  },
  time: {
    fontSize: 16,
    color: "#047857",
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: "600",
    color: "#047857",
    marginBottom: 4,
  },
  statusMoving: {
    color: "#059669",
  },
  statusIdle: {
    color: "#d97706",
  },
  firstMovement: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  coords: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    backgroundColor: "#059669",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
