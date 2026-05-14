import { View, Text, StyleSheet } from "react-native";
import type { ShiftsRow } from "@/types/database";
import { spacing } from "@/theme/spacing";

interface ShiftSummaryCardProps {
  shift: ShiftsRow;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    started: "Started",
    moving: "Moving",
    idle: "Idle",
    completed: "Completed",
    flagged: "Flagged",
  };
  return labels[status] ?? status;
}

function formatSuspiciousReason(reason: string | null): string {
  if (!reason) return "";
  const labels: Record<string, string> = {
    no_movement_within_threshold: "No movement at start",
    late_first_movement: "Late first movement",
    long_idle_period: "Long idle period",
    extended_shift: "Extended shift",
  };
  return labels[reason] ?? reason;
}

function returnEtaUnavailable(shift: ShiftsRow): boolean {
  const d = shift.suspicious_details;
  return (
    d != null &&
    typeof d === "object" &&
    (d as { return_eta_unavailable?: unknown }).return_eta_unavailable === true
  );
}

export function ShiftSummaryCard({ shift }: ShiftSummaryCardProps) {
  const isFlagged = shift.flagged_at != null;
  const etaMissing = returnEtaUnavailable(shift);

  return (
    <View style={[styles.card, isFlagged && styles.cardFlagged]}>
      <View style={styles.header}>
        <Text style={styles.time}>
          {formatTime(shift.clock_in_at)} –{" "}
          {shift.clock_out_at ? formatTime(shift.clock_out_at) : "—"}
        </Text>
        {isFlagged && (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>Flagged</Text>
          </View>
        )}
      </View>
      <Text style={styles.verified}>
        Verified (paid span):{" "}
        {formatMinutes(shift.verified_hours_minutes)}
      </Text>
      {shift.estimated_return_minutes != null ? (
        <>
          <Text style={styles.returnAudit}>
            Return-to-base (paid minutes):{" "}
            <Text style={styles.returnAuditBold}>
              {shift.estimated_return_minutes} min
            </Text>{" "}
            toward saved {shift.return_base_type ?? "base"}
          </Text>
          {etaMissing ? (
            <Text style={styles.returnNote}>
              Return drive time could not be estimated; recorded as 0 min—paid end
              time matches last dropoff.
            </Text>
          ) : null}
        </>
      ) : null}
      <Text style={styles.status}>Status: {formatStatus(shift.status)}</Text>
      {isFlagged && shift.suspicious_reason && (
        <Text style={styles.reason}>
          {formatSuspiciousReason(shift.suspicious_reason)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardFlagged: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  time: {
    fontSize: 16,
    fontWeight: "600",
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
  verified: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  returnAudit: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
  },
  returnAuditBold: {
    fontWeight: "600",
    color: "#475569",
  },
  returnNote: {
    fontSize: 12,
    color: "#c2410c",
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  status: {
    fontSize: 12,
    color: "#94a3b8",
  },
  reason: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 4,
  },
});
