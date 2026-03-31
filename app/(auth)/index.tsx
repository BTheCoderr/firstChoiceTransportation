import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ScreenContainer } from "@/components/layout";
import { colors, spacing } from "@/theme/spacing";

export default function LoginScreen() {
  const router = useRouter();
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

  const authBusy = isLoading || (user != null && profileLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authBusy) return;
    if (recoveryInProgress && user) {
      const id = setTimeout(
        () => router.replace("/(auth)/update-password"),
        0
      );
      return () => clearTimeout(id);
    }
    if (user && !profile && profileError == null) return;
    if (user && profile && role) {
      const id = setTimeout(
        () => router.replace(role === "admin" ? "/(admin)" : "/(driver)"),
        0
      );
      return () => clearTimeout(id);
    }
  }, [
    user,
    profile,
    role,
    authBusy,
    profileError,
    recoveryInProgress,
    router,
  ]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setIsSubmitting(false);
      setError(signInError.message === "Invalid login credentials"
        ? "Invalid email or password."
        : signInError.message);
      return;
    }

    setIsSubmitting(false);
  };

  if (authBusy) {
    return (
      <ScreenContainer
        safeAreaMode="fullBleed"
        scroll={false}
        contentContainerStyle={styles.centered}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {user ? "Loading your account…" : "Loading…"}
        </Text>
      </ScreenContainer>
    );
  }

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

  if (user && !profile && profileError != null) {
    return (
      <ScreenContainer
        safeAreaMode="fullBleed"
        scroll={false}
        contentContainerStyle={styles.centeredWide}
      >
        <Text style={styles.errorTitle}>Cannot load your account</Text>
        <Text style={styles.errorText}>{profileError}</Text>
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
      keyboardAvoiding
      scroll={false}
      contentContainerStyle={styles.authContent}
    >
      <Image
        source={require("../../assets/first-choice-transportation-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>First Choice Transportation</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="email-address"
        editable={!isSubmitting}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="off"
        editable={!isSubmitting}
      />

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.forgotLink}
        onPress={() => router.push("/(auth)/forgot-password")}
        disabled={isSubmitting}
      >
        <Text style={styles.forgotLinkText}>Forgot password?</Text>
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
  centeredWide: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  authContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textMuted,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: spacing.xs,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xxxl,
  },
  input: {
    width: "100%",
    maxWidth: 320,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  error: {
    width: "100%",
    maxWidth: 320,
    paddingBottom: spacing.md,
    fontSize: 14,
    color: "#dc2626",
  },
  button: {
    width: "100%",
    maxWidth: 320,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotLink: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  forgotLinkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
});
