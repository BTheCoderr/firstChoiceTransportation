import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getDriverDetail } from "@/services/admin";
import type { DriverDetailResult } from "@/services/admin";
import type { ShiftsRow } from "@/types/database";
import { AdminWeeklySummaryCard } from "@/components/admin/AdminWeeklySummaryCard";
import { LocationWithAddress } from "@/components/admin/LocationWithAddress";
import {
  DriverBaseForm,
  type SaveNamedBaseResult,
  type SaveDefaultTypeResult,
} from "@/components/driver/DriverBaseForm";
import {
  setDefaultBaseType,
  upsertNamedBase,
} from "@/services/driverBases";
import type { DriverBaseSettings } from "@/types/app";
import { resolveDefaultBaseForTravel } from "@/types/app";
import { ScreenContainer, ScreenSection, SectionHeading } from "@/components/layout";
import { colors, radii, spacing } from "@/theme/spacing";

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

function formatBaseSummaryLine(settings: DriverBaseSettings, which: "home" | "office"): string {
  const addr =
    which === "home" ? settings.homeBaseAddress : settings.officeBaseAddress;
  const lat =
    which === "home" ? settings.homeBaseLatitude : settings.officeBaseLatitude;
  const lng =
    which === "home" ? settings.homeBaseLongitude : settings.officeBaseLongitude;
  if (addr?.trim()) return addr.trim();
  if (lat != null && lng != null) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
  return "Not saved yet";
}

function ShiftRow({
  shift,
  onPress,
}: {
  shift: ShiftsRow;
  onPress: () => void;
}) {
  const isFlagged = shift.flagged_at != null;
  return (
    <Pressable
      style={[styles.shiftRow, isFlagged && styles.shiftRowFlagged]}
      onPress={onPress}
    >
      <View style={styles.shiftRowHeader}>
        <Text style={styles.shiftTime}>
          {formatDate(shift.clock_in_at)} · {formatTime(shift.clock_in_at)} –{" "}
          {shift.clock_out_at ? formatTime(shift.clock_out_at) : "—"}
        </Text>
        {isFlagged && (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>Flagged</Text>
          </View>
        )}
      </View>
      <Text style={styles.shiftVerified}>
        Verified: {formatMinutes(shift.verified_hours_minutes)}
      </Text>
    </Pressable>
  );
}

export default function AdminDriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DriverDetailResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBaseForm, setShowBaseForm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return null;
    const result = await getDriverDetail(id);
    setData(result);
    return result;
  }, [id]);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleShiftPress = (shiftId: string) => {
    router.push(`/(admin)/shift/${shiftId}`);
  };

  const handleSaveHome = async (input: {
    latitude: number;
    longitude: number;
    address: string | null;
  }): Promise<SaveNamedBaseResult> => {
    if (!id) return { ok: false };
    const result = await upsertNamedBase({
      driverId: id,
      name: "Home",
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
    });
    if (!result) return { ok: false };
    const refreshed = await load();
    if (!refreshed) return { ok: false };
    return {
      ok: true,
      defaultBaseType: refreshed.baseSettings.defaultBaseType,
    };
  };

  const handleSaveOffice = async (input: {
    latitude: number;
    longitude: number;
    address: string | null;
  }): Promise<SaveNamedBaseResult> => {
    if (!id) return { ok: false };
    const result = await upsertNamedBase({
      driverId: id,
      name: "Office",
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
    });
    if (!result) return { ok: false };
    const refreshed = await load();
    if (!refreshed) return { ok: false };
    return {
      ok: true,
      defaultBaseType: refreshed.baseSettings.defaultBaseType,
    };
  };

  const handleSaveDefaultType = async (
    type: "home" | "office"
  ): Promise<SaveDefaultTypeResult> => {
    if (!id) return { ok: false, error: "Missing driver." };
    const result = await setDefaultBaseType(id, type);
    if (result.ok) {
      await load();
      const label = type === "office" ? "Office" : "Home";
      return {
        ok: true,
        successMessage: `Default base updated to ${label}.`,
      };
    }
    const messages: Record<
      "MISSING_HOME" | "MISSING_OFFICE" | "UPDATE_FAILED",
      string
    > = {
      MISSING_HOME:
        "Save a Home base first before choosing Home as the default return location.",
      MISSING_OFFICE:
        "Save an Office base first before choosing Office as the default return location.",
      UPDATE_FAILED: "Could not update default base. Try again.",
    };
    return { ok: false, error: messages[result.reason] };
  };

  if (isLoading) {
    return (
      <ScreenContainer
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <Text style={styles.emptyText}>Driver not found.</Text>
      </ScreenContainer>
    );
  }

  const {
    profile,
    baseSettings,
    recentShifts,
    weeklyMinutes,
    weeklyShiftCount,
    weeklyFlaggedCount,
    weekStart,
  } = data;

  const resolvedDefault = resolveDefaultBaseForTravel(baseSettings);

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.profileSection}>
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        <Text style={styles.role}>Role: {profile.role}</Text>
      </View>

      <View style={styles.baseSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <SectionHeading size="medium" style={styles.headingInline}>
              Home and office bases
            </SectionHeading>
          </View>
          <Pressable
            style={styles.editButton}
            onPress={() => setShowBaseForm(!showBaseForm)}
          >
            <Text style={styles.editButtonText}>
              {showBaseForm ? "Cancel" : resolvedDefault ? "Edit" : "Set base"}
            </Text>
          </Pressable>
        </View>
        {showBaseForm ? (
          <DriverBaseForm
            driverId={id!}
            settings={baseSettings}
            onSaveHome={handleSaveHome}
            onSaveOffice={handleSaveOffice}
            onSaveDefaultType={handleSaveDefaultType}
          />
        ) : (
          <View style={styles.baseCard}>
            <Text style={styles.baseOverviewTitle}>Saved addresses</Text>
            <View style={styles.baseRow}>
              <Text style={styles.baseRowLabel}>Home</Text>
              <Text style={styles.baseRowValue} numberOfLines={3}>
                {formatBaseSummaryLine(baseSettings, "home")}
              </Text>
            </View>
            <View style={styles.baseRow}>
              <Text style={styles.baseRowLabel}>Office</Text>
              <Text style={styles.baseRowValue} numberOfLines={3}>
                {formatBaseSummaryLine(baseSettings, "office")}
              </Text>
            </View>

            <View style={styles.activeDefaultBlock}>
              <Text style={styles.baseName}>Active default for travel</Text>
              <Text style={styles.activeDefaultValue}>
                {baseSettings.defaultBaseType === "office" ? "Office" : "Home"}
              </Text>
              <Text style={styles.validationHint}>
                End-of-shift and return-time calculations use only this base, not
                the other one.
              </Text>
            </View>

            {resolvedDefault ? (
              <LocationWithAddress
                latitude={resolvedDefault.latitude}
                longitude={resolvedDefault.longitude}
              />
            ) : (
              <View style={styles.missingDefaultBox}>
                <Text style={styles.placeholder}>
                  No coordinates for the active default (
                  {baseSettings.defaultBaseType === "office" ? "Office" : "Home"}
                  ). Tap Edit to add that base or switch the default to a base that
                  is already saved.
                </Text>
              </View>
            )}

            <Text style={styles.editOverviewHint}>
              Tap Edit to change addresses or which base is the default.
            </Text>
          </View>
        )}
      </View>

      <ScreenSection title="Weekly summary">
        <AdminWeeklySummaryCard
          weekStart={weekStart}
          totalMinutes={weeklyMinutes}
          shiftCount={weeklyShiftCount}
          flaggedCount={weeklyFlaggedCount}
        />
      </ScreenSection>

      <ScreenSection title="Recent shifts">
        {recentShifts.length === 0 ? (
          <Text style={styles.placeholder}>No completed shifts yet.</Text>
        ) : (
          <View style={styles.shiftList}>
            {recentShifts.map((shift) => (
              <ShiftRow
                key={shift.id}
                shift={shift}
                onPress={() => handleShiftPress(shift.id)}
              />
            ))}
          </View>
        )}
      </ScreenSection>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
  profileSection: {
    marginBottom: spacing.sectionGap,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  role: {
    fontSize: 14,
    color: colors.textSubtle,
    textTransform: "capitalize",
  },
  baseSection: {
    marginBottom: spacing.sectionGap,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitleWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  headingInline: {
    marginBottom: 0,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  baseCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  baseOverviewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  baseRow: {
    marginBottom: spacing.md,
  },
  baseRowLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSubtle,
    marginBottom: 4,
  },
  baseRowValue: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  activeDefaultBlock: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  baseName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  activeDefaultValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  missingDefaultBox: {
    marginTop: spacing.sm,
  },
  editOverviewHint: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textMuted,
  },
  shiftList: {
    gap: spacing.cardGap,
  },
  shiftRow: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftRowFlagged: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  shiftRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  shiftVerified: {
    fontSize: 14,
    color: "#475569",
  },
  flagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: "#dc2626",
    borderRadius: 6,
  },
  flagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  placeholder: {
    fontSize: 14,
    color: colors.textSubtle,
  },
  validationHint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
