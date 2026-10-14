import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { createDriver } from "@/services/adminDriverCreation";
import { ScreenContainer, ScreenLead, ScreenTitle } from "@/components/layout";
import { colors, spacing } from "@/theme/spacing";

export default function CreateDriverScreen() {
  const router = useRouter();
  const { role, accessToken } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (isSubmitting) return;
    if (role !== "admin") {
      setError("Only an administrator can create a driver account.");
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createDriver({ email: normalized, accessToken });
      if (!result.success) {
        setError(result.error ?? "Could not create this driver.");
        return;
      }
      const message = result.activationEmailSent === false
        ? "The driver account was created, but the activation email was not sent. Check email delivery. The driver can use Forgot Password once mail is working."
        : "Driver account created. An activation email was requested. Ask the driver to check their inbox and spam folder, choose their own password, and complete their information. Confirm delivery before assigning shifts.";
      Alert.alert("Driver account created", message,
        [{ text: "OK", onPress: () => router.back() }]);
      setEmail("");
    } catch {
      setError("Request interrupted. Check the driver list before retrying.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (role !== "admin") {
    return (
      <ScreenContainer>
        <ScreenTitle>Administrator access required</ScreenTitle>
        <ScreenLead>Only an authorized company administrator can create driver profiles.</ScreenLead>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboardAvoiding safeAreaMode="navContent">
      <ScreenTitle>Invite driver</ScreenTitle>
      <ScreenLead>
        The administrator creates the account. Drivers cannot register themselves
        or select their role or company. After receiving an activation link, the
        driver chooses a password and completes their own information.
      </ScreenLead>
      <Text style={styles.label}>Driver email</Text>
      <TextInput
        style={styles.input}
        placeholder="driver@example.com"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isSubmitting}
        accessibilityLabel="Driver email"
      />
      <Text style={styles.note}>
        You'll set the driver's approved Home and Office GPS locations from their
        administrator profile before they can begin a tracked shift.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, isSubmitting && styles.disabled]}
        disabled={isSubmitting}
        accessibilityRole="button"
        onPress={() => void handleInvite()}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> :
          <Text style={styles.buttonText}>Create account and email activation</Text>}
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text, fontSize: 15, fontWeight: "600",
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1, borderColor: "#cbd5e1", borderRadius: spacing.sm,
    paddingVertical: 14, paddingHorizontal: spacing.lg, fontSize: 16,
    color: colors.text, marginBottom: spacing.md,
  },
  note: { color: colors.textMuted, lineHeight: 20, fontSize: 13, marginBottom: spacing.xl },
  error: { color: "#b91c1c", marginBottom: spacing.lg },
  button: {
    backgroundColor: colors.primary, paddingVertical: spacing.lg,
    borderRadius: spacing.sm, alignItems: "center",
  },
  disabled: { opacity: 0.65 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600", textAlign: "center" },
});
