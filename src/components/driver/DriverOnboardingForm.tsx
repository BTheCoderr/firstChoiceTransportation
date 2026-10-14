import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing } from "@/theme/spacing";

/**
 * Driver owns personal details only. Company, account identity, and GPS bases
 * are administrator-controlled and cannot be edited here.
 */
export function DriverOnboardingForm() {
  const { profile, retryLoadProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const submit = async () => {
    if (!profile || busy) return;
    const name = fullName.trim().replace(/\s+/g, " ");
    const phone = contactPhone.trim();
    if (name.length < 2 || name.length > 120) {
      setErrorText("Enter your full name (2 to 120 characters).");
      return;
    }
    if (phone.length > 40) {
      setErrorText("Contact phone is too long.");
      return;
    }
    setBusy(true);
    setErrorText(null);
    try {
      const { data: saved, error } = await supabase.from("profiles").update({
        full_name: name,
        contact_phone: phone || null,
        onboarding_completed_at: new Date().toISOString(),
      }).eq("id", profile.id)
        .select("id, onboarding_completed_at")
        .single();

      // A successful HTTP response without an updated row isn't a completed
      // onboarding. RLS can prevent an update from matching any row.
      if (error || !saved || saved.id !== profile.id ||
        !saved.onboarding_completed_at) {
        setErrorText("Your details were not saved. Check the connection and try again or contact your administrator.");
        return;
      }
      // Database trigger sets onboarding_completed_at to its server clock.
      await retryLoadProfile();
    } catch {
      setErrorText("Connection failed. Your details were not confirmed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.layout} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Welcome to First Choice</Text>
      <Text style={styles.body}>
        Your administrator has created your driver account. Complete your
        information to activate your workspace. Your company and approved
        Home/Office GPS locations are managed by your administrator.
      </Text>
      <Text style={styles.stepsTitle}>What happens next?</Text>
      <Text style={styles.body}>1. Enter your name and optional contact number.\n2. The administrator verifies your Home/Office GPS bases.\n3. Allow background location before starting a shift.\n4. Your shift and hours can be reviewed by the office.</Text>
      <Text style={styles.label}>Account email</Text>
      <Text style={styles.email}>{profile?.email ?? "—"}</Text>
      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
        placeholder="Enter your full name" autoCapitalize="words"
        placeholderTextColor="#64748b" editable={!busy}
        accessibilityLabel="Full name" />
      <Text style={styles.label}>Phone (optional)</Text>
      <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone}
        placeholder="Your contact number" keyboardType="phone-pad"
        placeholderTextColor="#64748b" editable={!busy}
        accessibilityLabel="Phone number" />
      {errorText && <Text style={styles.error}>{errorText}</Text>}
      <Pressable disabled={busy} onPress={() => void submit()} style={[styles.button,busy && styles.disabled]}>
        {busy ? <ActivityIndicator color="#fff" /> :
          <Text style={styles.buttonText}>Complete my driver information</Text>}
      </Pressable>
      <Pressable onPress={() => Linking.openURL("https://firstchoicetransportation.netlify.app/support")} style={styles.signOut}>
        <Text style={styles.signOutText}>Need help activating your account? Open support ↗</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => void signOut()} style={styles.signOut}>
        <Text style={styles.signOutText}>Not your account? Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  layout: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.surface },
  stepsTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  heading: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  body: { fontSize: 14, lineHeight: 21, color: colors.textMuted, marginBottom: spacing.xl },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  email: { fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, color: colors.text, borderRadius: radii.md,
    minHeight: 50, paddingHorizontal: spacing.lg, marginBottom: spacing.lg, fontSize: 16 },
  error: { fontSize: 13, color: "#b91c1c", marginBottom: spacing.md },
  button: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radii.md, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600", textAlign: "center" },
  disabled: { opacity: 0.6 },
  signOut: { padding: spacing.lg, alignItems: "center" },
  signOutText: { color: colors.primary, fontSize: 14 },
});
