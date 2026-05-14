import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { usePathname, useRouter, useSegments } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { ScreenContainer } from "@/components/layout";
import { colors, spacing } from "@/theme/spacing";
import {
  pathnameMatchesAdmin,
  pathnameMatchesAuth,
  pathnameMatchesDriver,
  pathnameMatchesRecoveryUpdatePassword,
} from "@/navigation/routeGuards";

/**
 * Root gate: never return null — always show loading, error, or redirecting UI.
 * `authBootBusy` covers the gap after session is applied but before profile resolves.
 */
export default function IndexScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  /** Stable primitive — avoids useSegments() new array ref every render in effect deps. */
  const segmentKey = segments.join("/");
  const {
    user,
    profile,
    role,
    isLoading,
    profileLoading,
    profileError,
    retryLoadProfile,
    signOut,
    recoveryInProgress,
  } = useAuth();

  const awaitingSignedInProfile =
    !!user &&
    !recoveryInProgress &&
    profile === null &&
    profileError === null;

  const authBootBusy =
    isLoading ||
    (!!user &&
      !recoveryInProgress &&
      (profileLoading || awaitingSignedInProfile));

  useEffect(() => {
    if (authBootBusy || (recoveryInProgress && user)) return;

    const id = setTimeout(() => {
      if (!user) {
        if (!pathnameMatchesAuth(pathname)) router.replace("/(auth)");
        return;
      }
      if (recoveryInProgress) {
        if (!pathnameMatchesRecoveryUpdatePassword(pathname)) {
          router.replace("/(auth)/update-password");
        }
        return;
      }
      if (!profile) {
        if (profileError != null) return;
        return;
      }
      if (role === "driver") {
        if (!pathnameMatchesDriver(pathname)) router.replace("/(driver)");
        return;
      }
      if (role === "admin") {
        if (!pathnameMatchesAdmin(pathname)) router.replace("/(admin)");
        return;
      }
      if (!pathnameMatchesAuth(pathname)) router.replace("/(auth)");
    }, 0);

    return () => clearTimeout(id);
  }, [
    user,
    profile,
    role,
    authBootBusy,
    recoveryInProgress,
    profileError,
    router,
    pathname,
    segmentKey,
  ]);

  if (recoveryInProgress && user) {
    return (
      <ScreenContainer
        safeAreaMode="fullBleed"
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading password reset…</Text>
      </ScreenContainer>
    );
  }

  if (authBootBusy) {
    return (
      <ScreenContainer
        safeAreaMode="fullBleed"
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading app…</Text>
      </ScreenContainer>
    );
  }

  if (user && !profile) {
    return (
      <ScreenContainer
        safeAreaMode="fullBleed"
        scroll={false}
        contentContainerStyle={styles.centeredWide}
      >
        <Text style={styles.errorTitle}>Cannot load your account</Text>
        <Text style={styles.errorText}>
          {profileError ?? "Your account could not be loaded. Please contact your administrator."}
        </Text>
        <Pressable style={styles.retryButton} onPress={retryLoadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      safeAreaMode="fullBleed"
      scroll={false}
      contentContainerStyle={styles.centered}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Redirecting…</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centeredWide: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textMuted,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: spacing.sm,
    color: "#dc2626",
  },
  errorText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  retryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    backgroundColor: "transparent",
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: "#666",
  },
  signOutButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
