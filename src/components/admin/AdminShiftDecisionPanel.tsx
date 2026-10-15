import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ShiftsRow } from "@/types/database";
import {
  decideShiftPayroll, displayApprovalStatus, formatPayableMinutes,
  type PayrollDecision, type PayrollReview, type PayrollReviewEvent,
} from "@/services/adminPayrollReview";

type Action = { decision: PayrollDecision; title: string; description: string };
const ACTIONS: Action[] = [
  { decision: "approved", title: "Exception approval / correction", description: "For disputed, recovered, or corrected shifts only. Routine hours are approved together at the end of the week in Weekly Payroll Approval." },
  { decision: "rejected", title: "Reject for payroll", description: "Excludes this record from payable totals, without erasing evidence." },
  { decision: "test_excluded", title: "Delete from operational view (test archive)", description: "Soft deletion only: removes proven test data from payroll/reporting, but preserves original records for audit." },
  { decision: "needs_review", title: "Return to review", description: "Reopens the administrative decision, preserving previous actions." },
];

export function AdminShiftDecisionPanel({ shift, review, events, onChanged }: {
  shift: ShiftsRow;
  review: PayrollReview | null;
  events: PayrollReviewEvent[];
  onChanged: () => Promise<void>;
}) {
  const [decision, setDecision] = useState<PayrollDecision>("needs_review");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const span = shift.clock_out_at
    ? Math.floor((new Date(shift.clock_out_at).getTime() - new Date(shift.clock_in_at).getTime()) / 60000)
    : null;
  const pendingRecovery = shift.verified_hours_minutes == null &&
    shift.suspicious_details?.shift_recovery === "closed_pending_payroll_review";

  if (!shift.clock_out_at) {
    return <Text style={styles.explain}>This shift is still open. Close it for review before a payroll decision.</Text>;
  }

  const save = () => {
    const value = decision === "approved" ? Number(minutes) : null;
    if (note.trim().length < 20) {
      setError("Describe the evidence or reason in at least 20 characters.");
      return;
    }
    if (decision === "approved" && (!/^\d+$/.test(minutes.trim()) ||
      value == null || !Number.isInteger(value) || value < 1 || value > 1440 ||
      (span != null && value > span))) {
      setError("Enter documented payable minutes (1–1,440), no more than the recorded shift span.");
      return;
    }
    if (pendingRecovery && decision === "approved") {
      setError("Use the separate recovery payroll approval workflow above first.");
      return;
    }
    const action = ACTIONS.find((x) => x.decision === decision);
    Alert.alert(decision === "test_excluded" ? "Archive test record (not permanent deletion)" : "Confirm payroll review", `${action?.title ?? "Update decision"}?\n\n${decision === "approved" ? `Payable: ${formatPayableMinutes(value)}.\n` : "No minutes will be counted as approved.\n"}The decision and explanation are permanently audited. Original shift and GPS records are retained; archived tests are excluded from approved totals.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => { void (async () => {
        setBusy(true); setError(null);
        try {
          const result = await decideShiftPayroll({
            shiftId: shift.id, decision, payableMinutes: value, note,
          });
          if (!result.ok) setError(result.message);
          else { setMinutes(""); setNote(""); await onChanged(); }
        } catch {
          setError("Unable to save the decision. Check the connection, migration and administrator permissions.");
        } finally { setBusy(false); }
      })(); } },
    ]);
  };
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Individual payroll exception</Text>
      <Text style={styles.explain}>Normal shifts do not need approval each day. Use Weekly Payroll Approval after the Monday–Sunday period ends. Use this screen only for exceptions, rejected shifts, test records, or corrections.</Text>
      <Text style={styles.explain}>Original recorded time: {formatPayableMinutes(shift.verified_hours_minutes)}. This is historical evidence, not approval.</Text>
      <Text style={styles.explain}>Current status: {displayApprovalStatus(shift, review)}</Text>
      {span != null && span > 1440 &&
        <Text style={styles.warn}>This shift spans more than 24 hours. Check the source records before approving any minutes.</Text>}
      {pendingRecovery &&
        <Text style={styles.warn}>This shift has a separate pending recovery approval. Finish that flow before approving here.</Text>}
      <Text style={styles.label}>Choose a decision</Text>
      {ACTIONS.map((action) => (
        <Pressable key={action.decision} onPress={() => { setDecision(action.decision); setError(null); }}
          accessibilityRole="radio" accessibilityState={{ checked: decision === action.decision }}
          style={[styles.option, decision === action.decision && styles.selected]}>
          <Text style={[styles.optionTitle, decision === action.decision && styles.selectedTitle]}>{action.title}</Text>
          <Text style={styles.explain}>{action.description}</Text>
        </Pressable>
      ))}
      {decision === "approved" &&
        <>
          <Text style={styles.label}>Payable minutes (not hours)</Text>
          <TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad"
            placeholder="Example: 480 for 8 hours" placeholderTextColor="#64748b"
            accessibilityLabel="Payable minutes" style={styles.input} />
          <Text style={styles.explain}>Enter the documented amount. The app will not copy the legacy recorded hours.</Text>
        </>}
      <Text style={styles.label}>Explanation and supporting evidence</Text>
      <TextInput value={note} onChangeText={setNote} multiline
        maxLength={1200} accessibilityLabel="Payroll decision explanation"
        placeholder="Describe how hours were verified, why the shift is rejected, or why it is test data."
        placeholderTextColor="#64748b" style={[styles.input, styles.note]} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable disabled={busy} onPress={save} style={[styles.button, busy && { opacity: 0.6 }]}>
        {busy ? <ActivityIndicator color="#fff" /> :
          <Text style={styles.buttonText}>Confirm decision and save audit</Text>}
      </Pressable>
      <Text style={styles.explain}>To correct previously approved hours, select Exception approval / correction, enter the corrected amount and evidence, then confirm. The original approval remains in the audit history.</Text>
      <Text style={styles.heading}>Review history</Text>
      {events.length === 0 && <Text style={styles.explain}>No payroll decision has been recorded yet.</Text>}
      {events.map((event) => (
        <View key={event.id} style={styles.history}>
          <Text style={styles.optionTitle}>{event.new_decision.replace(/_/g, " ")}</Text>
          <Text style={styles.explain}>{new Date(event.created_at).toLocaleString()}</Text>
          <Text style={styles.explain}>Payable: {formatPayableMinutes(event.new_payable_minutes)}</Text>
          <Text style={styles.explain}>{event.note}</Text>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { padding: 16, borderRadius: 12, backgroundColor: "#f8fafc", gap: 10, borderWidth: 1, borderColor: "#dbe3ed" },
  heading: { fontSize: 17, color: "#0f172a", fontWeight: "700", marginTop: 4 },
  explain: { fontSize: 13, lineHeight: 19, color: "#64748b" },
  warn: { padding: 10, color: "#9a3412", backgroundColor: "#fff7ed", borderRadius: 8, lineHeight: 20 },
  label: { color: "#1f2937", fontWeight: "600", marginTop: 7, fontSize: 14 },
  option: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 9, padding: 12, gap: 3 },
  selected: { borderColor: "#315eea", borderWidth: 2 },
  optionTitle: { fontWeight: "600", color: "#1e293b", fontSize: 14 },
  selectedTitle: { color: "#1e40af" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, color: "#111827", fontSize: 15, minHeight: 44 },
  note: { minHeight: 100, textAlignVertical: "top" },
  error: { color: "#b91c1c" },
  button: { padding: 15, backgroundColor: "#285bed", borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  history: { paddingVertical: 10, borderTopWidth: 1, borderColor: "#cbd5e1", gap: 4 },
});
