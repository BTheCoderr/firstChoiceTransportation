import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout";
import { createTicket } from "@/services/supportTickets";
import { colors, spacing } from "@/theme/spacing";

export default function RequestAccountDeletionScreen() {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (busy || message) return;
    Alert.alert(
      "Request account deletion?",
      "This sends a documented request to your company administrator. It does not immediately remove your login or erase payroll and location records that must be retained.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send request", style: "destructive", onPress: () => { void (async () => {
          setBusy(true);
          setError(null);
          try {
            const result = await createTicket({
              subject: "Account deletion request",
              category: "account",
              message: "Please review termination of my First Choice account access and deletion of personal information that can lawfully be removed. " +
                (reason.trim() ? "Additional details: " + reason.trim() : "Please contact me through this support case about any records that must be retained."),
            });
            if (!result.ok) {
              setError(result.message);
            } else {
              setMessage("Request recorded. Your company administrator can review it in the Support Center. Keep a record of this request until you receive confirmation.");
            }
          } catch {
            setError("Could not submit the request. Check your connection and try again.");
          } finally {
            setBusy(false);
          }
        })(); } },
      ]
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Request account deletion</Text>
      <Text style={styles.body}>You can request that your company administrator close your account and review which personal information can be erased. Certain shift, GPS, payroll, and audit records may need to be retained under employment or other legal requirements.</Text>
      <Text style={styles.body}>Submitting this request does not immediately disable your account. If access must be revoked urgently, contact the administrator directly. Do not include passwords or other people's private information.</Text>
      <Text style={styles.label}>Optional details</Text>
      <TextInput accessibilityLabel="Optional account deletion request details" style={styles.input}
        multiline maxLength={1000} value={reason} editable={!busy && !message}
        placeholder="Anything the administrator should know?" placeholderTextColor="#64748b"
        onChangeText={setReason} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy || !!message}
        style={[styles.button,(busy || !!message) && styles.disabled]} onPress={submit}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit account deletion request</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>Back to my profile</Text>
      </Pressable>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 23, marginBottom: spacing.lg },
  label: { color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: spacing.sm },
  input: { minHeight: 90, borderWidth: 1, borderColor: colors.border, color: colors.text,
    borderRadius: 10, padding: 12, textAlignVertical: "top", marginBottom: spacing.lg },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  error: { color: "#b91c1c", marginBottom: 12 },
  success: { color: "#166534", marginBottom: 12, lineHeight: 23 },
  back: { padding: 16, alignItems: "center" },
  backText: { color: colors.primary },
});
