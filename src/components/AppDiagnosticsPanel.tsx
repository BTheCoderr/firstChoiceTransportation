import type { ReactElement } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Constants from "expo-constants";
import { useAuth } from "@/hooks/useAuth";
import { colors, spacing } from "@/theme/spacing";

function supabaseHostOnly(raw: string | undefined): string {
  if (!raw || typeof raw !== "string" || raw.trim().length === 0) return "—";
  const withProto = raw.includes("://") ? raw.trim() : `https://${raw.trim()}`;
  try {
    const u = new URL(withProto);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return "— (invalid URL)";
  }
}

type ExpoExtra = {
  gitCommitHash?: string;
  supabaseUrl?: string;
  eas?: { projectId?: string };
};

/**
 * Visible diagnostics — no secrets. Supabase URL is stripped to hostname only.
 * Use on device to verify TestFlight/build alignment.
 */
export function AppDiagnosticsPanel(): ReactElement {
  const { user, role, profileLoading } = useAuth();
  const expoConfig = Constants.expoConfig;
  const extra = (expoConfig?.extra ?? {}) as ExpoExtra;

  /** Prefer inlined host from bundled config (omit query/hash). */
  const supabaseUrlFull =
    (extra.supabaseUrl as string | undefined)?.trim() || "";
  const envLabel = __DEV__ ? "development" : "production";
  const appVersion =
    expoConfig?.version ?? Constants.nativeAppVersion ?? "—";
  const iosBuildNumber =
    expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? "—";
  const sdkVersion = expoConfig?.sdkVersion ?? "—";
  const appOwnership =
    Constants.appOwnership === null || Constants.appOwnership === undefined
      ? "—"
      : String(Constants.appOwnership);
  const projectId =
    typeof extra.eas?.projectId === "string"
      ? extra.eas.projectId
      : "—";
  const commit =
    typeof extra.gitCommitHash === "string" && extra.gitCommitHash.length > 0
      ? extra.gitCommitHash
      : "(not injected — EAS GIT_COMMIT_* at build time)";

  const email =
    user?.email && user.email.length > 0 ? user.email : "—";

  let roleShown: string;
  if (!user) roleShown = "— (signed out)";
  else if (profileLoading) roleShown = "loading…";
  else if (role) roleShown = role;
  else roleShown = "—";

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Diagnostics</Text>
      <Text style={styles.help}>
        Use this screen to verify you are testing the expected TestFlight/native
        build (version + build number + commit hash).
      </Text>

      <View style={styles.card}>
        <Row label="App version (marketing)" value={String(appVersion)} />
        <Row label="iOS build number (CFBundleVersion)" value={String(iosBuildNumber)} />
        <Row label="Expo SDK" value={String(sdkVersion)} />
        <Row label="App ownership" value={appOwnership} />
        <Row label="EAS project id" value={projectId} />
        <Row label="Environment label" value={envLabel} />
      </View>

      <View style={styles.card}>
        <Row label="Supabase host only" value={supabaseHostOnly(supabaseUrlFull)} />
        <Row label="Signed-in role" value={roleShown} />
        <Row label="Signed-in email" value={email} />
      </View>

      <View style={styles.card}>
        <Row label="App commit hash" value={commit} multiline />
      </View>
    </ScrollView>
  );
}

function Row(props: {
  label: string;
  value: string;
  multiline?: boolean;
}): ReactElement {
  const { label, value, multiline } = props;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, multiline && styles.multiline]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  help: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 15,
    color: colors.text,
  },
  multiline: {
    fontFamily: "Menlo",
    fontSize: 12,
  },
});
