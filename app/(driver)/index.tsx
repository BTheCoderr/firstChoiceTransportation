import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import { useAuth } from "@/hooks/useAuth";
import { useDriverShift } from "@/providers/DriverShiftProvider";
import { useDriverLocation } from "@/providers/ShiftLocationProvider";
import { getCurrentPosition } from "@/services/location";
import { getDefaultBaseForDriver } from "@/services/driverBases";
import { getTodaysLastShiftForDriver } from "@/services/shifts";
import { StartShiftCard } from "@/components/driver/StartShiftCard";
import { ShiftStatusCard } from "@/components/driver/ShiftStatusCard";
import { FinalDropoffCard } from "@/components/driver/FinalDropoffCard";
import { ShiftSummaryCard } from "@/components/driver/ShiftSummaryCard";
import { LocationStatusCard } from "@/components/driver/LocationStatusCard";
import {
  LocationBlockingBanner,
  LocationUnavailableBanner,
} from "@/components/driver/LocationBlockingBanner";
import { ScreenContainer, ScreenHeadline, ScreenSection } from "@/components/layout";
import type { ShiftsRow } from "@/types/database";
import { colors, spacing } from "@/theme/spacing";
import { useMountedRef } from "@/hooks/useMountedRef";

const REFRESH_ALL_TIMEOUT_MS = 25_000;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DriverHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const driverId = profile?.id;
  const {
    activeShift,
    isLoading,
    isStarting,
    isEnding,
    refresh,
    startShift,
    endShift,
  } = useDriverShift();
  const {
    permissionReady,
    foregroundPermission,
    hasForegroundPermission,
    isTracking,
    requestPermissions,
    startTracking,
    refreshState,
  } = useDriverLocation();

  const [todaysLastShift, setTodaysLastShift] = useState<ShiftsRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasBaseLocation, setHasBaseLocation] = useState(false);
  const { mountedRef, safeSetState } = useMountedRef();
  /** Guard against rapid double-taps; the parent `isStarting` flag races with state propagation. */
  const startInFlightRef = useRef(false);

  useEffect(() => {
    if (!profile?.id) return;
    void (async () => {
      try {
        const base = await getDefaultBaseForDriver(profile.id);
        safeSetState(() => setHasBaseLocation(!!base));
      } catch {
        /* ignore */
      }
    })();
  }, [profile?.id, safeSetState]);

  const loadTodaysLastShift = useCallback(async () => {
    if (!driverId) return;
    const shift = await getTodaysLastShiftForDriver(driverId);
    safeSetState(() => setTodaysLastShift(shift));
  }, [driverId, safeSetState]);

  useEffect(() => {
    if (!activeShift && driverId) {
      void loadTodaysLastShift();
    } else {
      safeSetState(() => setTodaysLastShift(null));
    }
  }, [driverId, activeShift, loadTodaysLastShift, safeSetState]);

  /** When Home tab gains focus, sync active shift + base for End shift (matches Shift tab). */
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          await refresh({ silent: true });
          if (!active || !profile?.id) return;
          const base = await getDefaultBaseForDriver(profile.id);
          if (active) {
            safeSetState(() => setHasBaseLocation(!!base));
          }
        } catch {
          /* ignore */
        }
      })();
      return () => {
        active = false;
      };
    }, [refresh, profile?.id, safeSetState])
  );

  const handleRefresh = async () => {
    safeSetState(() => setRefreshing(true));
    try {
      await Promise.race([
        Promise.all([
          refresh({ silent: true }),
          refreshState(),
          loadTodaysLastShift(),
          profile?.id
            ? getDefaultBaseForDriver(profile.id).then((base) => {
                safeSetState(() => setHasBaseLocation(!!base));
              })
            : Promise.resolve(),
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("REFRESH_TIMEOUT")), REFRESH_ALL_TIMEOUT_MS)
        ),
      ]);
    } catch {
      // Always clear pull-to-refresh spinner even if a sub-task hangs
    } finally {
      safeSetState(() => setRefreshing(false));
    }
  };

  const handleLocationRetry = async () => {
    await requestPermissions();
    await refreshState();
  };

  /** Only block Start Shift when we *know* permission was denied — never while unknown/unavailable. */
  const blockStartBecauseLocationDenied =
    permissionReady && foregroundPermission === "denied";

  const handleStartShift = async () => {
    if (!driverId) return;
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;
    safeSetState(() => setStartError(null));
    safeSetState(() => setIsGettingLocation(true));
    try {
      const position = await getCurrentPosition();
      if (!mountedRef.current) return;
      if (!position.ok) {
        safeSetState(() => setStartError(position.error));
        return;
      }

      const { shift, error } = await startShift(SINGLE_COMPANY_ID, {
        lat: position.lat,
        lng: position.lng,
      });
      if (!mountedRef.current) return;
      if (shift) {
        router.push("/(driver)/shift");
        void (async () => {
          try {
            await startTracking(shift.id);
          } catch {
            // Non-fatal: user can start tracking from Shift tab
          }
        })();
      } else if (error) {
        safeSetState(() => setStartError(error));
        if (error.includes("already have an active shift")) {
          await refresh({ silent: true });
        }
      }
    } finally {
      safeSetState(() => setIsGettingLocation(false));
      startInFlightRef.current = false;
    }
  };

  const handleViewShift = () => {
    router.push("/(driver)/shift");
  };

  const handleFinalDropoff = async (lat: number, lng: number) => {
    if (!activeShift) return { success: false, error: "NO_SHIFT" };
    const result = await endShift(activeShift.id, lat, lng);
    if (result.success) {
      await refresh({ silent: true });
    }
    return {
      success: result.success,
      error: !result.success ? result.error : undefined,
    };
  };

  const firstName = profile?.full_name?.split(" ")[0] ?? "Driver";

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

  const showDeniedBanner =
    !activeShift && permissionReady && foregroundPermission === "denied";
  const showUnavailableBanner =
    !activeShift && permissionReady && foregroundPermission === "unavailable";

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <ScreenHeadline>
        {getGreeting()}, {firstName}
      </ScreenHeadline>

      {showDeniedBanner && (
        <LocationBlockingBanner
          message="Location is required to start a shift. Enable access in Settings, or tap Retry after the system prompt."
          onRetry={handleLocationRetry}
        />
      )}
      {showUnavailableBanner && (
        <LocationUnavailableBanner onRetry={handleLocationRetry} />
      )}
      {!activeShift && (
        <LocationStatusCard
          locationEnabled={hasForegroundPermission}
          trackingActive={isTracking}
        />
      )}
      {startError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{startError}</Text>
          <Text style={styles.retryHint}>Tap Start Shift below to try again.</Text>
        </View>
      ) : null}
      {activeShift ? (
        <>
          <ShiftStatusCard shift={activeShift} onViewShift={handleViewShift} />
          <ScreenSection title="End your shift" spacingTop={spacing.xl}>
            <Text style={styles.sectionHelp}>
              Start shifts on Home; end with the button below when you are at your
              last dropoff.
            </Text>
            <FinalDropoffCard
              onFinalDropoff={handleFinalDropoff}
              isEnding={isEnding}
              hasBaseLocation={hasBaseLocation}
            />
          </ScreenSection>
        </>
      ) : (
        <StartShiftCard
          onStartShift={handleStartShift}
          isStarting={isStarting}
          isGettingLocation={isGettingLocation}
          blockStartBecauseLocationDenied={blockStartBecauseLocationDenied}
          locationPermissionPending={!permissionReady}
        />
      )}

      {!activeShift && todaysLastShift && (
        <ScreenSection title="Today's last shift" spacingTop={spacing.xxxl}>
          <ShiftSummaryCard shift={todaysLastShift} />
        </ScreenSection>
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
  errorBanner: {
    backgroundColor: "#fef2f2",
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
  },
  retryHint: {
    fontSize: 13,
    color: "#b91c1c",
    marginTop: spacing.sm,
  },
  sectionHelp: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
});
