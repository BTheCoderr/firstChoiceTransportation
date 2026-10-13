import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { AdminDriverCard } from "@/components/admin/AdminDriverCard";
import { AdminShiftListItem } from "@/components/admin/AdminShiftListItem";
import { AppSurface, ScreenContainer, SectionHeading } from "@/components/layout";
import { colors, spacing } from "@/theme/spacing";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { drivers, recentShifts, openShifts, isLoading, loadError, refresh } =
    useAdminDashboard(SINGLE_COMPANY_ID);

  const [refreshing, setRefreshing] = useState(false);
  const pendingPayrollShifts = recentShifts.filter(
    ({ shift }) => shift.clock_out_at != null &&
      shift.verified_hours_minutes == null &&
      shift.suspicious_details?.shift_recovery === "closed_pending_payroll_review"
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDriverPress = (driverId: string) => {
    router.push(`/(admin)/driver/${driverId}`);
  };

  const handleShiftPress = (shiftId: string) => {
    router.push(`/(admin)/shift/${shiftId}`);
  };

  const handleCreateDriver = () => router.push("/(admin)/create-driver");
  const handleWeeklyHours = () => router.push("/(admin)/weekly");

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <AppSurface style={styles.adminTools}>
        <Text style={styles.adminToolsTitle}>Admin tools</Text>
        <Text style={styles.adminToolsSubtitle}>
          Add drivers and review weekly hours from here.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={handleCreateDriver}
          accessibilityLabel="Create Driver"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Create Driver</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.outlineButton,
            pressed && styles.outlineButtonPressed,
          ]}
          onPress={handleWeeklyHours}
          accessibilityLabel="Weekly Hours"
          accessibilityRole="button"
        >
          <Text style={styles.outlineButtonText}>Weekly Hours</Text>
        </Pressable>
      </AppSurface>

      {isLoading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading drivers and shifts…</Text>
        </View>
      ) : loadError ? (
        <Text style={styles.loadError}>{loadError}</Text>
      ) : (
        <>
          <SectionHeading size="large" style={styles.driversHeading}>
            Open shifts requiring GPS return or review ({openShifts.length})
          </SectionHeading>
          <Text style={styles.reviewHelp}>
            These shifts are not yet clocked out. Investigate overdue shifts and
            review the GPS route before closing them. Payroll approval is separate.
          </Text>
          {openShifts.length === 0 ? (
            <Text style={styles.placeholder}>No open shifts need review.</Text>
          ) : (
            <View style={styles.cardList}>
              {openShifts.map((item) => {
                const ageHours = (Date.now() - new Date(item.shift.clock_in_at).getTime()) / 3_600_000;
                return (
                  <View key={item.shift.id}>
                    {ageHours >= 16 ? (
                      <Text style={styles.overdueLabel}>
                        Review needed: open for {Math.floor(ageHours)} hours
                      </Text>
                    ) : (
                      <Text style={styles.activeLabel}>Tracking in progress</Text>
                    )}
                    <AdminShiftListItem
                      item={item}
                      onPress={() => handleShiftPress(item.shift.id)}
                    />
                  </View>
                );
              })}
            </View>
          )}

          {pendingPayrollShifts.length > 0 && (
            <>
              <SectionHeading size="large" style={styles.recentHeading}>
                Payroll approval pending ({pendingPayrollShifts.length})
              </SectionHeading>
              <Text style={styles.reviewHelp}>
                These shifts were administratively closed but still have no approved
                paid minutes. Open each audit and explicitly approve the documented hours.
              </Text>
              <View style={styles.cardList}>
                {pendingPayrollShifts.map((item) => (
                  <AdminShiftListItem
                    key={item.shift.id}
                    item={item}
                    onPress={() => handleShiftPress(item.shift.id)}
                  />
                ))}
              </View>
            </>
          )}

          <SectionHeading size="large" style={styles.driversHeading}>
            Drivers
          </SectionHeading>
          {drivers.length === 0 ? (
            <Text style={styles.placeholder}>No drivers in your company.</Text>
          ) : (
            <View style={styles.cardList}>
              {drivers.map((driver) => (
                <AdminDriverCard
                  key={driver.id}
                  driver={driver}
                  onPress={() => handleDriverPress(driver.id)}
                />
              ))}
            </View>
          )}

          <SectionHeading size="large" style={styles.recentHeading}>
            Recent shifts
          </SectionHeading>
          {recentShifts.length === 0 ? (
            <Text style={styles.placeholder}>No completed shifts yet.</Text>
          ) : (
            <View style={styles.cardList}>
              {recentShifts.map((item) => (
                <AdminShiftListItem
                  key={item.shift.id}
                  item={item}
                  onPress={() => handleShiftPress(item.shift.id)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  adminTools: {
    width: "100%",
    marginBottom: spacing.xxxl,
  },
  adminToolsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: spacing.xs,
  },
  adminToolsSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  outlineButton: {
    width: "100%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonPressed: {
    opacity: 0.85,
    backgroundColor: "#eff6ff",
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  loadingBlock: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 15,
    color: colors.textMuted,
  },
  driversHeading: {
    marginTop: 0,
  },
  recentHeading: {
    marginTop: spacing.xxxl,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textSubtle,
    marginBottom: spacing.md,
  },
  loadError: { color: "#b91c1c", fontSize: 14, marginBottom: spacing.md },
  reviewHelp: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  overdueLabel: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  activeLabel: {
    color: "#475569",
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  cardList: {
    gap: spacing.cardGap,
  },
});
