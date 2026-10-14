import { useState } from "react";
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ShiftsRow, RoutePointsRow } from "@/types/database";
import {
  approveRecoveredShiftHours,
  closeOpenShiftForReview,
  type ShiftRecoveryReason,
  type ShiftReviewEvent,
} from "@/services/shiftRecovery";
import { colors, radii, spacing } from "@/theme/spacing";
import { ReviewedEndTimePicker } from "@/components/admin/ReviewedEndTimePicker";

const REASONS: { value: ShiftRecoveryReason; label: string }[] = [
  { value: "gps_unavailable", label: "GPS unavailable" },
  { value: "device_failure", label: "Phone/device issue" },
  { value: "missed_return_detection", label: "Return detection missed" },
  { value: "admin_review", label: "Admin correction" },
  { value: "other", label: "Other" },
];

function displayTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export function AdminShiftRecoveryPanel({
  shift, routePoints, reviewEvents, onChanged,
}: {
  shift: ShiftsRow;
  routePoints: RoutePointsRow[];
  reviewEvents: ShiftReviewEvent[];
  onChanged: () => Promise<void>;
}) {
  const [reviewedEnd, setReviewedEnd] = useState<Date | null>(null);
  const [reason, setReason] = useState<ShiftRecoveryReason>("gps_unavailable");
  const [note, setNote] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pendingReview =
    shift.clock_out_at != null &&
    shift.verified_hours_minutes == null &&
    reviewEvents.some((e) => e.action === "close_pending_review");

  const latestGps = routePoints.length ? routePoints[routePoints.length - 1] : null;
  const suggestedTime = latestGps?.recorded_at ?? null;
  const reviewedSpanMinutes = shift.clock_out_at == null
    ? null
    : Math.max(0, Math.floor(
      (new Date(shift.clock_out_at).getTime() - new Date(shift.clock_in_at).getTime()) / 60000
    ));

  const confirmClosure = () => {
    if (!reviewedEnd || !Number.isFinite(reviewedEnd.getTime())) {
      setErrorMessage("Select and confirm an evidence-supported end time.");
      return;
    }
    const end = reviewedEnd;
    const start = new Date(shift.clock_in_at);
    if (end < start || end > new Date() ||
      end.getTime() > start.getTime() + 24 * 3600000) {
      setErrorMessage("Choose a reviewed time between clock-in and now, within 24 hours of clock-in.");
      return;
    }
    if (note.trim().length < 10) {
      setErrorMessage("Add at least 10 characters explaining the end-time evidence.");
      return;
    }
    Alert.alert(
      "Close this shift for review?",
      `Reviewed end: ${end.toLocaleString()} (${end.toISOString()}). This releases the driver but does NOT approve payroll. Your documented decision is permanently audited.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close for review",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setErrorMessage(null);
              try {
                const result = await closeOpenShiftForReview({
                  shiftId: shift.id, effectiveEndAt: end.toISOString(), reason, note,
                });
                if (!result.ok) {
                  setErrorMessage(result.error);
                } else {
                  await onChanged();
                }
              } catch {
                setErrorMessage("Network error while closing this shift. Refresh before retrying.");
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  const confirmApproval = () => {
    if (approvalNote.trim().length < 10) {
      setErrorMessage("Enter a payroll approval explanation (10 characters minimum).");
      return;
    }
    Alert.alert(
      "Approve payable time?",
      `You are approving ${reviewedSpanMinutes ?? "unknown"} minutes based on the documented end time. This is a separate recorded payroll decision.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve minutes",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setErrorMessage(null);
              try {
                const result = await approveRecoveredShiftHours(shift.id, approvalNote);
                if (!result.ok) setErrorMessage(result.error);
                else await onChanged();
              } catch {
                setErrorMessage("Network error during approval. Refresh before retrying.");
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      {shift.clock_out_at == null ? (
        <View style={styles.panel}>
          <Text style={styles.heading}>Administrative shift recovery</Text>
          <Text style={styles.body}>
            This shift is still open. Review its route, stops, and clock-in time first.
            Choose the documented end time; closing it only releases the driver to
            start another shift. Payroll remains pending until separately approved.
          </Text>
          <Text style={styles.label}>Clock-in (local time)</Text>
          <Text style={styles.body}>{displayTime(shift.clock_in_at)}</Text>
          <ReviewedEndTimePicker clockIn={shift.clock_in_at}
            value={reviewedEnd} onChange={setReviewedEnd} />
          {suggestedTime && (
            <Pressable
              onPress={() => { const candidate = new Date(suggestedTime); if (Number.isFinite(candidate.getTime())) setReviewedEnd(candidate); }}
              accessibilityRole="button"
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Use latest GPS timestamp as starting point</Text>
            </Pressable>
          )}
          <Text style={styles.hint}>
            GPS timestamps are evidence to evaluate, not automatic approval.
            Confirm the selected time and timezone against other records.
          </Text>
          <Text style={styles.label}>Reason</Text>
          <View style={styles.reasons}>
            {REASONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setReason(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === option.value }}
                style={[styles.reason, reason === option.value && styles.reasonSelected]}
              >
                <Text style={[styles.reasonText, reason === option.value && styles.reasonTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Explanation and supporting evidence</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1200}
            accessibilityLabel="Shift recovery explanation"
            placeholder="Describe GPS evidence, driver contact, dispatch records, or why the end time is supported."
            placeholderTextColor="#64748b"
            style={[styles.input, styles.note]}
          />
          <Pressable
            disabled={busy}
            onPress={confirmClosure}
            accessibilityRole="button"
            style={[styles.action, busy && styles.disabled]}
          >
            {busy ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.actionText}>Close shift pending payroll review</Text>}
          </Pressable>
        </View>
      ) : pendingReview ? (
        <View style={styles.panel}>
          <Text style={styles.heading}>Payroll approval pending</Text>
          <Text style={styles.body}>
            The shift is closed, and the driver may start the next shift.
            Payable time has not been approved or included in verified totals.
          </Text>
          <Text style={styles.label}>Reviewed clock-out: {displayTime(shift.clock_out_at)}</Text>
          <Text style={styles.label}>Calculated span: {reviewedSpanMinutes} minutes</Text>
          <TextInput
            value={approvalNote}
            onChangeText={setApprovalNote}
            multiline
            maxLength={1200}
            accessibilityLabel="Payroll approval explanation"
            placeholder="Explain the evidence supporting approval of these paid minutes."
            placeholderTextColor="#64748b"
            style={[styles.input, styles.note]}
          />
          <Pressable disabled={busy} onPress={confirmApproval}
            accessibilityRole="button" style={[styles.action, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.actionText}>Approve documented payable minutes</Text>}
          </Pressable>
        </View>
      ) : null}

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {reviewEvents.length > 0 && (
        <View style={styles.audit}>
          <Text style={styles.heading}>Administrator audit history</Text>
          {reviewEvents.map((event) => (
            <View key={event.id} style={styles.auditRow}>
              <Text style={styles.auditTitle}>
                {event.action === "close_pending_review" ? "Closed for review" : "Payable time approved"}
              </Text>
              <Text style={styles.body}>{displayTime(event.created_at)}</Text>
              <Text style={styles.body}>Admin ID: {event.actor_id.slice(0, 8)}</Text>
              <Text style={styles.body}>Reason: {event.reason}</Text>
              <Text style={styles.body}>{event.note}</Text>
              {event.approved_minutes != null &&
                <Text style={styles.body}>Approved: {event.approved_minutes} minutes</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.md, gap: spacing.md },
  panel: { padding: spacing.lg, backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: "600", color: colors.text },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  body: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  hint: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  input: { color: colors.text, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, minHeight: 46, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontSize: 14 },
  note: { minHeight: 90, textAlignVertical: "top" },
  secondary: { padding: spacing.sm, borderRadius: radii.md, backgroundColor: "#eff6ff" },
  secondaryText: { color: colors.primary, fontSize: 13 },
  reasons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reason: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  reasonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonText: { fontSize: 12, color: colors.text },
  reasonTextSelected: { color: "#fff" },
  action: { backgroundColor: colors.primary, padding: spacing.md,
    borderRadius: radii.md, alignItems: "center", marginTop: spacing.sm },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 14, textAlign: "center" },
  disabled: { opacity: 0.6 },
  error: { color: "#b91c1c", fontSize: 13 },
  audit: { padding: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  auditRow: { borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, gap: spacing.xs },
  auditTitle: { color: colors.text, fontWeight: "600", fontSize: 14 },
});
