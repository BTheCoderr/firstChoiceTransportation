import { useState, useRef } from "react";
import type { TextInput as TextInputType } from "react-native";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { createDriver } from "@/services/adminDriverCreation";
import { ScreenContainer, ScreenLead, ScreenTitle } from "@/components/layout";
import { colors, spacing } from "@/theme/spacing";

/** Basic email shape check before hitting the network. */
function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function CreateDriverScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [homeBaseAddress, setHomeBaseAddress] = useState("");
  const [homeBaseLat, setHomeBaseLat] = useState("");
  const [homeBaseLng, setHomeBaseLng] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputType>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (__DEV__) {
      console.log("[CreateDriver][debug] submit: started");
    }
    setError(null);

    /* iOS secure fields can lag behind React state until blur — flush before reading password. */
    passwordRef.current?.blur();
    Keyboard.dismiss();
    if (Platform.OS === "ios") {
      await new Promise<void>((r) => setTimeout(r, 120));
    }

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    const passwordTrimmed = password.trim();
    if (!passwordTrimmed) {
      setError("Temporary password is required.");
      return;
    }
    if (passwordTrimmed.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const lat = homeBaseLat.trim() ? parseFloat(homeBaseLat) : null;
    const lng = homeBaseLng.trim() ? parseFloat(homeBaseLng) : null;
    if ((lat != null && lng == null) || (lat == null && lng != null)) {
      setError("Provide both latitude and longitude for home base, or leave both blank.");
      return;
    }
    if (lat != null && (isNaN(lat) || lat < -90 || lat > 90)) {
      setError("Latitude must be between -90 and 90.");
      return;
    }
    if (lng != null && (isNaN(lng) || lng < -180 || lng > 180)) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    if (__DEV__) {
      console.log("[CreateDriver][debug] submit: validation passed", {
        passwordLength: passwordTrimmed.length,
        hasContextAccessToken: Boolean(accessToken?.trim()),
      });
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createDriver({
        full_name: fullName.trim(),
        email: email.trim(),
        password: passwordTrimmed,
        home_base_address: homeBaseAddress.trim() || null,
        home_base_latitude: lat,
        home_base_longitude: lng,
        accessToken,
      });

      if (result.success) {
        if (__DEV__) {
          console.log("[CreateDriver][debug] submit: createDriver result", {
            success: true,
            hasUserId: Boolean(result.userId),
            email: result.email ?? null,
          });
        }
        const baseNote = lat != null && lng != null ? "\n\nHome base was set." : "";
        Alert.alert(
          "Driver created",
          `Give the driver these credentials:\n\nEmail: ${result.email}\nPassword: (the one you entered)\n\nThey can sign in on the app.${baseNote}`,
          [{ text: "OK", onPress: () => router.back() }]
        );
        setFullName("");
        setEmail("");
        setPassword("");
        setHomeBaseAddress("");
        setHomeBaseLat("");
        setHomeBaseLng("");
      } else {
        if (__DEV__) {
          console.log("[CreateDriver][debug] submit: createDriver result", {
            success: false,
            error: result.error ?? null,
          });
        }
        setError(result.error ?? "Failed to create driver");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (__DEV__) {
        console.log("[CreateDriver][debug] submit: thrown", {
          name: err instanceof Error ? err.name : "(non-Error)",
          message: msg,
        });
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer keyboardAvoiding safeAreaMode="navContent">
      <ScreenTitle>Create driver</ScreenTitle>
      <ScreenLead>
        Drivers cannot create their own accounts. Enter the driver&apos;s details below.
        You&apos;ll give them the credentials to sign in.
      </ScreenLead>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#999"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        editable={!isSubmitting}
      />

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

      <TextInput
        ref={passwordRef}
        style={styles.input}
        placeholder="Temporary password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        editable={!isSubmitting}
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />

      <Text style={styles.hint}>
        Password must be at least 6 characters. Share this with the driver so they can sign in.
      </Text>

      <Text style={styles.sectionLabel}>Home base (optional)</Text>
      <Text style={styles.sectionHint}>
        Set the driver&apos;s home base for shift verification. Leave blank if unknown; you can add it
        later from the driver detail screen.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Address (e.g. 123 Main St)"
        placeholderTextColor="#999"
        value={homeBaseAddress}
        onChangeText={setHomeBaseAddress}
        autoCapitalize="words"
        editable={!isSubmitting}
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Latitude"
          placeholderTextColor="#999"
          value={homeBaseLat}
          onChangeText={setHomeBaseLat}
          keyboardType="numeric"
          editable={!isSubmitting}
        />
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Longitude"
          placeholderTextColor="#999"
          value={homeBaseLng}
          onChangeText={setHomeBaseLng}
          keyboardType="numeric"
          editable={!isSubmitting}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create driver</Text>
        )}
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  hint: {
    fontSize: 13,
    color: colors.textSubtle,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputHalf: {
    flex: 1,
    marginBottom: 0,
  },
  error: {
    fontSize: 14,
    color: "#dc2626",
    marginBottom: spacing.lg,
  },
  button: {
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
