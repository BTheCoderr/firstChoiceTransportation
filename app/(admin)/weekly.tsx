import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, RefreshControl,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useRouter } from "expo-router";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import { ScreenContainer } from "@/components/layout";
import { colors, radii, spacing } from "@/theme/spacing";
import {
  loadPayrollDrivers, reviewDriverPayrollWeek,
  type PayrollDriver, type WeeklyPayrollPreview,
} from "@/services/weeklyPayroll";
import { easternPayrollWeekStart, payrollWeekDisplay } from "@/utils/payrollWeek";

function formatMinutes(value: number): string {
  return Math.floor(value / 60) + "h " + String(value % 60).padStart(2, "0") + "m";
}

export default function AdminWeeklyHoursScreen() {
  const router = useRouter();
  const [weeksAgo, setWeeksAgo] = useState(1);
  const weekStart = useMemo(() => easternPayrollWeekStart(new Date(), weeksAgo), [weeksAgo]);
  const [drivers, setDrivers] = useState<PayrollDriver[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<WeeklyPayrollPreview | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    try {
      const result = await loadPayrollDrivers(SINGLE_COMPANY_ID);
      setDrivers(result);
      setError(null);
    } catch {
      setDrivers([]);
      setError("Could not load drivers. Check administrator access and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDrivers(); }, [loadDrivers]);

  const selectWeek = (next: number) => {
    if (busy || next < 1 || next > 52) return;
    setWeeksAgo(next);
    setSelectedId(null);
    setPreview(null);
    setApprovalNote("");
    setError(null);
    setSuccess(null);
  };

  const review = async (driverId: string, targetWeek = weekStart) => {
    setBusy(true);
    setSelectedId(driverId);
    setPreview(null);
    setError(null);
    setSuccess(null);
    try {
      const next = await reviewDriverPayrollWeek(driverId, targetWeek);
      setPreview(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not preview the week.");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadDrivers();
    if (selectedId) await review(selectedId);
    setRefreshing(false);
  };

  const approve = () => {
    if (!preview?.canApprove || !selectedId || busy) return;
    if (approvalNote.trim().length < 20 || approvalNote.trim().length > 1200) {
      setError("Explain the weekly payroll approval in 20–1,200 characters.");
      return;
    }
    const driverId = selectedId;
    const name = drivers.find((d) => d.id === driverId)?.fullName ?? "this driver";
    const targetWeek = weekStart;
    const note = approvalNote.trim();
    const expectedMinutes = preview.eligibleMinutes;
    const expectedShifts = preview.eligibleCount;
    Alert.alert(
      "Approve completed payroll week?",
      "Approve " + formatMinutes(expectedMinutes) + " across " + expectedShifts +
        " eligible shifts for " + name + " (" + payrollWeekDisplay(targetWeek) +
        ")? This creates audited decisions; excluded or exceptional shifts cannot be bulk-approved.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve week", onPress: () => {
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              const saved = await reviewDriverPayrollWeek(driverId, targetWeek, {
                approve: true, note,
              });
              const refreshed = await reviewDriverPayrollWeek(driverId, targetWeek);
              setPreview(refreshed);
              setSuccess("Approved " + saved.newlyApproved +
                " shifts for this completed week. Audit records saved.");
              setApprovalNote("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Weekly approval failed. No partial decision was saved.");
              try { setPreview(await reviewDriverPayrollWeek(driverId, targetWeek)); } catch {
                setPreview(null);
              }
            } finally {
              setBusy(false);
            }
          })();
        } },
      ]
    );
  };

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={refreshing}
      onRefresh={() => { void refresh(); }} />}>
      <Text style={styles.title}>Weekly payroll approval</Text>
      <Text style={styles.explainer}>
        Drivers end shifts normally. Hours collect here and are not payable until
        an administrator approves their completed Monday–Sunday week. Unusual
        shifts still require individual evidence review.
      </Text>
      <View style={styles.weekNavigation}>
        <Pressable accessibilityRole="button" disabled={weeksAgo >= 52 || busy}
          onPress={() => selectWeek(weeksAgo + 1)} style={styles.weekButton}>
          <Text style={styles.weekButtonText}>‹ Older week</Text>
        </Pressable>
        <View style={styles.weekCenter}>
          <Text style={styles.weekTitle}>{payrollWeekDisplay(weekStart)}</Text>
          <Text style={styles.weekCaption}>Completed pay period · Eastern time</Text>
        </View>
        <Pressable accessibilityRole="button" disabled={weeksAgo <= 1 || busy}
          onPress={() => selectWeek(weeksAgo - 1)} style={styles.weekButton}>
          <Text style={styles.weekButtonText}>Newer ›</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}
      {!loading && drivers.length === 0 && !error &&
        <Text style={styles.explainer}>No drivers found for this company.</Text>}

      {drivers.map((driver) => (
        <View key={driver.id} style={styles.driverCard}>
          <View style={styles.driverTop}>
            <Text style={styles.driverName}>{driver.fullName}</Text>
            <Pressable accessibilityRole="button" disabled={busy}
              style={styles.reviewButton} onPress={() => { void review(driver.id); }}>
              <Text style={styles.reviewButtonText}>
                {busy && selectedId === driver.id ? "Loading…" : "Review week"}
              </Text>
            </Pressable>
          </View>
          {selectedId === driver.id && preview && (
            <View style={styles.weekDetail}>
              <Text style={styles.summaryText}>
                {preview.shiftCount} recorded shifts · {preview.approvedCount} previously approved
              </Text>
              <Text style={styles.summaryText}>
                Eligible for weekly approval: {preview.eligibleCount} shifts · {formatMinutes(preview.eligibleMinutes)}
              </Text>
              <Text style={styles.summaryText}>
                Already approved: {formatMinutes(preview.approvedMinutes)}
              </Text>
              <Text style={styles.exceptionText}>
                Open: {preview.openCount} · Requires individual review: {preview.exceptionCount}
                {" · "}Excluded: {preview.excludedCount}
              </Text>
              {preview.items.map((item) => (
                <Pressable key={item.shiftId} accessibilityRole="button"
                  onPress={() => router.push(`/(admin)/shift/${item.shiftId}`)}
                  style={styles.shiftRow}>
                  <Text style={styles.shiftDate}>
                    {new Date(item.clockInAt).toLocaleDateString("en-US",
                      { timeZone: "America/New_York", month: "short", day: "numeric" })}
                  </Text>
                  <Text style={styles.shiftState}>
                    {item.status === "eligible" ? formatMinutes(item.minutes ?? 0) + " · Ready" :
                      item.status === "approved" ? formatMinutes(item.minutes ?? 0) + " · Approved" :
                      item.status === "excluded" ? "Excluded" :
                      item.status === "open" ? "Still open" : "Needs individual review"}
                    {"  ›"}
                  </Text>
                </Pressable>
              ))}
              {preview.exceptionCount > 0 || preview.openCount > 0 ? (
                <Text style={styles.explainWarning}>
                  Resolve open or flagged shift exceptions separately before approving
                  the rest of this week. Exceptions never get automatic approval.
                </Text>
              ) : null}
              {preview.canApprove && (
                <>
                  <Text style={styles.noteLabel}>Administrator approval note (required)</Text>
                  <TextInput value={approvalNote} onChangeText={setApprovalNote}
                    editable={!busy} accessibilityLabel="Weekly payroll approval explanation"
                    multiline maxLength={1200} style={styles.noteInput}
                    placeholder="Explain which weekly hours and supporting records you reviewed."
                    placeholderTextColor={colors.textMuted} />
                  <Pressable accessibilityRole="button" disabled={busy}
                    onPress={approve} style={styles.approveButton}>
                    <Text style={styles.approveText}>
                      {busy ? "Saving…" : "Approve " + formatMinutes(preview.eligibleMinutes) + " for this week"}
                    </Text>
                  </Pressable>
                </>
              )}
              {preview.eligibleCount === 0 && preview.exceptionCount === 0 &&
                preview.openCount === 0 && (
                  <Text style={styles.completed}>
                    No additional eligible hours to approve for this period.
                  </Text>
                )}
            </View>
          )}
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: colors.text, fontWeight: "700", marginBottom: 10 },
  explainer: { color: colors.textMuted, lineHeight: 22, fontSize: 14, marginBottom: spacing.lg },
  weekNavigation: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 16 },
  weekButton: { padding: 8, minHeight: 44, justifyContent: "center" },
  weekButtonText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  weekCenter: { flex: 1, alignItems: "center" },
  weekTitle: { color: colors.text, fontWeight: "700", fontSize: 15, textAlign: "center" },
  weekCaption: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
  error: { padding: 12, backgroundColor: "#fef2f2", color: "#b91c1c",
    borderRadius: 8, marginBottom: 12, lineHeight: 20 },
  success: { padding: 12, backgroundColor: "#f0fdf4", color: "#166534",
    borderRadius: 8, marginBottom: 12, lineHeight: 20 },
  driverCard: { padding: 14, backgroundColor: colors.surface, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  driverTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  driverName: { color: colors.text, fontSize: 16, fontWeight: "600", flex: 1 },
  reviewButton: { minHeight: 44, backgroundColor: colors.primary,
    justifyContent: "center", paddingHorizontal: 12, borderRadius: 8 },
  reviewButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  weekDetail: { marginTop: 15, borderTopWidth: 1, borderColor: colors.border,
    paddingTop: 14 },
  summaryText: { color: colors.text, fontSize: 14, marginBottom: 7, lineHeight: 20 },
  exceptionText: { color: "#9a3412", fontSize: 13, marginBottom: 10 },
  shiftRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border, gap: 8, minHeight: 44 },
  shiftDate: { color: colors.text, fontWeight: "600", fontSize: 13 },
  shiftState: { color: colors.textMuted, fontSize: 13, flexShrink: 1 },
  explainWarning: { color: "#9a3412", lineHeight: 20, marginTop: 14, marginBottom: 10 },
  noteLabel: { marginTop: 18, marginBottom: 9, color: colors.text, fontWeight: "600" },
  noteInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 9,
    color: colors.text, minHeight: 76, padding: 12, textAlignVertical: "top" },
  approveButton: { backgroundColor: colors.primary, padding: 16,
    borderRadius: 9, marginTop: 12, alignItems: "center", minHeight: 50 },
  approveText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  completed: { color: "#166534", marginTop: 12, lineHeight: 20 },
});
