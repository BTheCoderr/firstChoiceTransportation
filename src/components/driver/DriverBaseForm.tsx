import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import type { DriverBasesRow } from "@/types/database";

type BaseType = "Home" | "Office";

interface DriverBaseFormProps {
  driverId: string;
  existingBase?: DriverBasesRow | null;
  onSave: (input: {
    name: BaseType;
    latitude: number;
    longitude: number;
    address: string | null;
  }) => Promise<boolean>;
}

export function DriverBaseForm({
  driverId,
  existingBase,
  onSave,
}: DriverBaseFormProps) {
  const [baseType, setBaseType] = useState<BaseType>("Home");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingBase) {
      setBaseType((existingBase.name as BaseType) || "Home");
      setAddress(existingBase.address ?? "");
      setLatitude(existingBase.latitude.toString());
      setLongitude(existingBase.longitude.toString());
    }
  }, [existingBase]);

  const handleSave = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setError("Enter valid latitude and longitude.");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Latitude must be -90 to 90. Longitude must be -180 to 180.");
      return;
    }
    setError(null);
    setIsSaving(true);
    const ok = await onSave({
      name: baseType,
      latitude: lat,
      longitude: lng,
      address: address.trim() || null,
    });
    setIsSaving(false);
    if (!ok) setError("Failed to save. Please try again.");
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.label}>Base type</Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.typeButton, baseType === "Home" && styles.typeButtonActive]}
            onPress={() => setBaseType("Home")}
          >
            <Text
              style={[
                styles.typeButtonText,
                baseType === "Home" && styles.typeButtonTextActive,
              ]}
            >
              Home
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeButton, baseType === "Office" && styles.typeButtonActive]}
            onPress={() => setBaseType("Office")}
          >
            <Text
              style={[
                styles.typeButtonText,
                baseType === "Office" && styles.typeButtonTextActive,
              ]}
            >
              Office
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Address (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 123 Main St, Los Angeles, CA"
          placeholderTextColor="#94a3b8"
          value={address}
          onChangeText={setAddress}
          autoCapitalize="words"
          autoComplete="off"
        />

        <Text style={styles.label}>Latitude</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 34.0522"
          placeholderTextColor="#94a3b8"
          value={latitude}
          onChangeText={setLatitude}
          keyboardType="decimal-pad"
          autoComplete="off"
        />

        <Text style={styles.label}>Longitude</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. -118.2437"
          placeholderTextColor="#94a3b8"
          value={longitude}
          onChangeText={setLongitude}
          keyboardType="decimal-pad"
          autoComplete="off"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {existingBase ? "Update base" : "Save base"}
            </Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    marginTop: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  error: {
    fontSize: 14,
    color: "#dc2626",
    marginTop: 12,
  },
  button: {
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: "#2563eb",
    borderRadius: 8,
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
