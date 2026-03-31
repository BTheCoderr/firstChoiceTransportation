import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import {
  getPasswordRecoveryRedirectTo,
  PASSWORD_RECOVERY_BRIDGE_URL,
} from "@/auth/passwordRecovery";
import { ScreenContainer } from "@/components/layout";
import { colors, spacing } from "@/theme/spacing";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const redirectTo = getPasswordRecoveryRedirectTo();
      if (__DEV__) {
        console.log(
          "[Forgot password] redirectTo (must match Supabase Redirect URLs):",
          redirectTo,
          "expected:",
          PASSWORD_RECOVERY_BRIDGE_URL
        );
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        { redirectTo }
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setMessage(
        "If an account exists for that email, you will receive a link to reset your password. Open it on this device to continue."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        We will email you a link. Use the same email you use to sign in.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!isSubmitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSend}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send reset link</Text>
        )}
      </Pressable>

      <Pressable style={styles.link} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back to sign in</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  authContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
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
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
    textAlign: "center",
    maxWidth: 320,
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
  success: {
    width: "100%",
    maxWidth: 320,
    paddingBottom: spacing.md,
    fontSize: 14,
    color: "#059669",
    textAlign: "center",
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    marginTop: spacing.xl,
  },
  linkText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600",
  },
});
