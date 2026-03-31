import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { getDriverBaseSettings } from "@/services/driverBases";
import {
  resolveDefaultBaseForTravel,
  isSelectedDefaultBaseEmpty,
  type DriverBaseSettings,
} from "@/types/app";
import { ScreenContainer, ScreenLead, ScreenTitle } from "@/components/layout";
import { colors, radii, spacing } from "@/theme/spacing";

export default function DriverProfileScreen() {
  const { profile } = useAuth();
  const driverId = profile?.id;
  const [settings, setSettings] = useState<DriverBaseSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBase = useCallback(async () => {
    if (!driverId) return;
    const s = await getDriverBaseSettings(driverId);
    setSettings(s);
  }, [driverId]);

  useEffect(() => {
    loadBase().finally(() => setIsLoading(false));
  }, [loadBase]);

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

  const resolved =
    settings != null ? resolveDefaultBaseForTravel(settings) : null;
  const defaultEmpty =
    settings != null && isSelectedDefaultBaseEmpty(settings);

  return (
    <ScreenContainer>
      <ScreenTitle>Default base</ScreenTitle>
      <ScreenLead>
        Your admin sets Home and Office. End-of-shift travel time uses only the
        default base your admin selected — not the other location.
      </ScreenLead>
      {resolved ? (
        <View style={styles.baseCard}>
          <Text style={styles.baseName}>Default ({resolved.name})</Text>
          <Text style={styles.baseCoords}>
            {resolved.latitude.toFixed(5)}, {resolved.longitude.toFixed(5)}
          </Text>
          {resolved.address ? (
            <Text style={styles.baseAddress}>{resolved.address}</Text>
          ) : null}
        </View>
      ) : defaultEmpty ? (
        <View style={styles.noBaseCard}>
          <Text style={styles.noBaseText}>
            No coordinates for your default base (
            {settings?.defaultBaseType === "office" ? "Office" : "Home"})
          </Text>
          <Text style={styles.noBaseHint}>
            Ask your admin to save that base, or to change the default to a base
            that already has an address. The app does not use the other base when
            this one is empty.
          </Text>
        </View>
      ) : (
        <View style={styles.noBaseCard}>
          <Text style={styles.noBaseText}>No base set</Text>
          <Text style={styles.noBaseHint}>
            Contact your admin to set up your home or office base. You need a
            default base with coordinates to end shifts and record verified hours.
          </Text>
        </View>
      )}
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
  baseCard: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  baseName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  baseCoords: {
    fontSize: 14,
    color: colors.textMuted,
  },
  baseAddress: {
    fontSize: 14,
    color: "#475569",
    marginTop: spacing.sm,
  },
  noBaseCard: {
    padding: spacing.xl,
    backgroundColor: "#fefce8",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#fef08a",
  },
  noBaseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#854d0e",
    marginBottom: spacing.sm,
  },
  noBaseHint: {
    fontSize: 14,
    color: "#a16207",
    lineHeight: 20,
  },
});
