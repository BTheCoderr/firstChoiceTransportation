import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import { ScreenContainer } from "@/components/layout";
import {
  getReviewableCompanyShifts, displayApprovalStatus, formatPayableMinutes,
  type ReviewableShift,
} from "@/services/adminPayrollReview";

type Filter = "unreviewed" | "approved" | "rejected" | "test_excluded" | "all";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "unreviewed", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "test_excluded", label: "Test / archived" },
  { value: "all", label: "All" },
];
export default function AdminReviewCenterScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("unreviewed");
  const [rows, setRows] = useState<ReviewableShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setRows(await getReviewableCompanyShifts(SINGLE_COMPANY_ID));
    } catch {
      setError("The secure payroll review ledger is not available. Migration 027 must be reviewed and deployed by an administrator before decisions are enabled. Existing records were not changed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const shown = useMemo(() => rows.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unreviewed") return !item.review || item.review.decision === "needs_review";
    return item.review?.decision === filter;
  }), [filter, rows]);

  const approvedMinutes = rows.reduce((sum, item) =>
    sum + (item.review?.decision === "approved" ? item.review.payable_minutes ?? 0 : 0), 0);

  return (
    <ScreenContainer refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true); await refresh(); setRefreshing(false);
      }} />
    }>
      <Text style={styles.title}>Shift Review Center</Text>
      <Text style={styles.explain}>Review historical and flagged records without changing their original clock-in, GPS or payroll evidence. Recorded hours are not necessarily approved payable hours.</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Records loaded: {rows.length}</Text>
        <Text style={styles.summaryText}>Explicitly approved: {formatPayableMinutes(approvedMinutes)}</Text>
        <Text style={styles.hint}>Up to 200 recent closed records are shown. Reports must not treat unreviewed, rejected or test records as approved.</Text>
      </View>
      {loading && <ActivityIndicator />}
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Pressable key={item.value} accessibilityRole="button"
            accessibilityState={{ selected: filter === item.value }}
            style={[styles.filter, filter === item.value && styles.activeFilter]}
            onPress={() => setFilter(item.value)}>
            <Text style={[styles.filterText, filter === item.value && styles.activeFilterText]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {shown.length === 0 && !loading && !error &&
        <Text style={styles.hint}>No records in this category.</Text>}
      {shown.map(({ shift, driverName, review }) => (
        <Pressable key={shift.id} style={styles.row}
          accessibilityRole="button"
          onPress={() => router.push(`/(admin)/shift/${shift.id}`)}>
          <Text style={styles.driver}>{driverName}</Text>
          <Text style={styles.body}>{new Date(shift.clock_in_at).toLocaleDateString()} · {shift.status}</Text>
          <Text style={styles.body}>Original recorded: {formatPayableMinutes(shift.verified_hours_minutes)}</Text>
          <Text style={[styles.body, review?.decision === "approved" ? styles.approved : styles.warning]}>
            {displayApprovalStatus(shift, review)}
          </Text>
          <Text style={styles.link}>Review evidence and decision →</Text>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 10 },
  explain: { fontSize: 14, color: "#475569", lineHeight: 21, marginBottom: 16 },
  summary: { backgroundColor: "#eff6ff", padding: 16, borderRadius: 12, marginBottom: 16 },
  summaryText: { fontSize: 15, fontWeight: "600", color: "#1e3a8a", marginBottom: 6 },
  hint: { fontSize: 13, lineHeight: 19, color: "#64748b", marginBottom: 14 },
  error: { padding: 12, borderRadius: 10, backgroundColor: "#fef2f2", color: "#b91c1c", marginBottom: 12 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  filter: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1" },
  activeFilter: { backgroundColor: "#285bed", borderColor: "#285bed" },
  filterText: { color: "#334155", fontSize: 13 },
  activeFilterText: { color: "#fff", fontWeight: "600" },
  row: { padding: 14, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, backgroundColor: "#f8fafc", marginBottom: 12, gap: 4 },
  driver: { fontWeight: "700", color: "#0f172a", fontSize: 17 },
  body: { color: "#475569", fontSize: 13, lineHeight: 19 },
  approved: { color: "#047857" },
  warning: { color: "#9a3412" },
  link: { fontWeight: "600", color: "#285bed", paddingTop: 5 },
});
