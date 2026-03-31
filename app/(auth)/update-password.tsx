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
import { ScreenContainer } from "@/components/layout";
import { colors, spacing } from "@/theme/spacing";

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      // End recovery session so the user lands on login and signs in with the new password
      // (avoids auto-redirect to main app as a logged-in recovery session).
      await supabase.auth.signOut();
      router.replace("/(auth)");
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
      <Text style={styles.title}>Set new password</Text>
      <Text style={styles.subtitle}>
        Choose a new password for your account.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="New password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor="#999"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        editable={!isSubmitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save password</Text>
        )}
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
});
