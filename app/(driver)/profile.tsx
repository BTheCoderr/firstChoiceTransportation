import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { getDriverBaseSettings } from "@/services/driverBases";
import {
  resolveDefaultBaseForTravel,
  isSelectedDefaultBaseEmpty,
  type DriverBaseSettings,
} from "@/types/app";
import { ScreenContainer, ScreenLead, ScreenTitle } from "@/components/layout";
import { colors, radii, spacing } from "@/theme/spacing";
import { useMountedRef } from "@/hooks/useMountedRef";

export default function DriverProfileScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const driverId = profile?.id;
  const [settings, setSettings] = useState<DriverBaseSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { safeSetState } = useMountedRef();

  useEffect(() => {
    let cancelled = false;
    if (!driverId) {
      safeSetState(() => setIsLoading(false));
      return;
    }
    void (async () => {
      try {
        const s = await getDriverBaseSettings(driverId);
        if (!cancelled) {
          safeSetState(() => setSettings(s));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          safeSetState(() => setIsLoading(false));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId, safeSetState]);

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
      <ScreenTitle>My driver profile</ScreenTitle>
      <ScreenLead>
        Your administrator created this account. Your personal information is
        yours to provide, but your company, role, and GPS-approved Home and Office
        are administrator-controlled. Either saved base may confirm return.
      </ScreenLead>
      <View style={styles.baseCard}>
        <Text style={styles.baseName}>{profile?.full_name ?? "Driver"}</Text>
        <Text style={styles.baseAddress}>{profile?.email ?? ""}</Text>
        {profile?.contact_phone ? (
          <Text style={styles.baseAddress}>{profile.contact_phone}</Text>
        ) : null}
      </View>
      <Text style={styles.baseName}>Legacy default return base</Text>
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
            Ask your admin to confirm Home and Office locations. Automatic GPS
            clock-out can use either saved location after a confirmed return.
          </Text>
        </View>
      ) : (
        <View style={styles.noBaseCard}>
          <Text style={styles.noBaseText}>No base set</Text>
          <Text style={styles.noBaseHint}>
            Contact your admin to set up at least one approved Home or Office
            GPS location before starting a tracked shift.
          </Text>
        </View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Diagnostics and build information"
        style={{ minHeight: 48, justifyContent: "center", padding: 14, marginTop: 16 }}
        onPress={() => router.push("/(driver)/diagnostics")}>
        <Text style={{ color: colors.primary, fontWeight: "600" }}>Diagnostics & build info →</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Request account deletion"
        style={{ minHeight: 48, justifyContent: "center", padding: 14, marginTop: 24 }}
        onPress={() => router.push("/(driver)/delete-account")}>
        <Text style={{ color: colors.primary, fontWeight: "600" }}>Request account deletion →</Text>
      </Pressable>
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
