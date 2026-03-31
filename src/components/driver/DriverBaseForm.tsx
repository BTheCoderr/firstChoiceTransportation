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
import * as Location from "expo-location";
import type { DriverBaseSettings } from "@/types/app";

type EditTab = "Home" | "Office";

/** Returned after a successful save so the form can explain default vs edited base. */
export type SaveNamedBaseResult =
  | { ok: true; defaultBaseType: "home" | "office" }
  | { ok: false };

export type SaveDefaultTypeResult =
  | { ok: true; successMessage: string }
  | { ok: false; error?: string };

interface DriverBaseFormProps {
  driverId: string;
  settings: DriverBaseSettings;
  onSaveHome: (input: {
    latitude: number;
    longitude: number;
    address: string | null;
  }) => Promise<SaveNamedBaseResult>;
  onSaveOffice: (input: {
    latitude: number;
    longitude: number;
    address: string | null;
  }) => Promise<SaveNamedBaseResult>;
  onSaveDefaultType: (
    type: "home" | "office"
  ) => Promise<SaveDefaultTypeResult>;
}

/**
 * Resolve lat/lng: use manual fields if valid; otherwise geocode address (DB requires coordinates).
 */
async function resolveBaseCoordinates(
  address: string,
  latitudeStr: string,
  longitudeStr: string
): Promise<
  { ok: true; latitude: number; longitude: number } | { ok: false; message: string }
> {
  const latTrim = latitudeStr.trim();
  const lngTrim = longitudeStr.trim();
  const lat = parseFloat(latitudeStr);
  const lng = parseFloat(longitudeStr);
  const hasAnyCoord = latTrim !== "" || lngTrim !== "";
  const hasBothCoords =
    latTrim !== "" &&
    lngTrim !== "" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng);

  if (hasAnyCoord && !hasBothCoords) {
    return {
      ok: false,
      message:
        "Enter both latitude and longitude, or leave both empty to use address lookup.",
    };
  }

  if (hasBothCoords) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        ok: false,
        message: "Latitude must be -90 to 90. Longitude must be -180 to 180.",
      };
    }
    return { ok: true, latitude: lat, longitude: lng };
  }

  const trimmed = address.trim();
  if (!trimmed) {
    return {
      ok: false,
      message:
        "Enter a street address to look up coordinates, or enter latitude and longitude.",
    };
  }

  try {
    const results = await Location.geocodeAsync(trimmed);
    if (!results?.length) {
      return {
        ok: false,
        message:
          "Could not find that address. Try a fuller address (street, city, state, ZIP) or enter coordinates manually.",
      };
    }
    const { latitude, longitude } = results[0];
    return { ok: true, latitude, longitude };
  } catch {
    return {
      ok: false,
      message:
        "Address lookup failed. Check the address or enter latitude and longitude manually.",
    };
  }
}

function successMessageForBaseSave(
  savedTab: EditTab,
  defaultBaseType: "home" | "office"
): string {
  const savedName = savedTab;
  const defaultName = defaultBaseType === "office" ? "Office" : "Home";
  if (
    (savedTab === "Home" && defaultBaseType === "home") ||
    (savedTab === "Office" && defaultBaseType === "office")
  ) {
    return `${savedName} base saved. It is also the active default for travel and end of shift.`;
  }
  return `${savedName} base saved. ${defaultName} is still the active default for travel and end-of-shift calculations.`;
}

export function DriverBaseForm({
  driverId: _driverId,
  settings,
  onSaveHome,
  onSaveOffice,
  onSaveDefaultType,
}: DriverBaseFormProps) {
  const [editTab, setEditTab] = useState<EditTab>("Home");

  const [homeAddress, setHomeAddress] = useState("");
  const [homeLatitude, setHomeLatitude] = useState("");
  const [homeLongitude, setHomeLongitude] = useState("");

  const [officeAddress, setOfficeAddress] = useState("");
  const [officeLatitude, setOfficeLatitude] = useState("");
  const [officeLongitude, setOfficeLongitude] = useState("");

  const [localDefaultType, setLocalDefaultType] = useState<"home" | "office">(
    settings.defaultBaseType
  );

  const [isSavingBase, setIsSavingBase] = useState(false);
  const [isSavingDefault, setIsSavingDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setHomeAddress(settings.homeBaseAddress ?? "");
    setHomeLatitude(
      settings.homeBaseLatitude != null ? String(settings.homeBaseLatitude) : ""
    );
    setHomeLongitude(
      settings.homeBaseLongitude != null ? String(settings.homeBaseLongitude) : ""
    );
    setOfficeAddress(settings.officeBaseAddress ?? "");
    setOfficeLatitude(
      settings.officeBaseLatitude != null
        ? String(settings.officeBaseLatitude)
        : ""
    );
    setOfficeLongitude(
      settings.officeBaseLongitude != null
        ? String(settings.officeBaseLongitude)
        : ""
    );
    setLocalDefaultType(settings.defaultBaseType);
  }, [settings]);

  const address = editTab === "Home" ? homeAddress : officeAddress;
  const latitudeStr = editTab === "Home" ? homeLatitude : officeLatitude;
  const longitudeStr = editTab === "Home" ? homeLongitude : officeLongitude;

  const setAddress =
    editTab === "Home" ? setHomeAddress : setOfficeAddress;
  const setLatitudeStr =
    editTab === "Home" ? setHomeLatitude : setOfficeLatitude;
  const setLongitudeStr =
    editTab === "Home" ? setHomeLongitude : setOfficeLongitude;

  const handleSaveActiveBase = async () => {
    setError(null);
    setSuccess(null);
    const resolved = await resolveBaseCoordinates(
      address,
      latitudeStr,
      longitudeStr
    );
    if (!resolved.ok) {
      setError(resolved.message);
      return;
    }

    setIsSavingBase(true);
    const payload = {
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      address: address.trim() || null,
    };
    const result =
      editTab === "Home"
        ? await onSaveHome(payload)
        : await onSaveOffice(payload);
    setIsSavingBase(false);
    if (!result.ok) {
      setError("Failed to save. Please try again.");
      return;
    }
    setSuccess(successMessageForBaseSave(editTab, result.defaultBaseType));
  };

  const handleDefaultTypePress = async (next: "home" | "office") => {
    setError(null);
    setSuccess(null);
    if (next === localDefaultType) return;
    setIsSavingDefault(true);
    const result = await onSaveDefaultType(next);
    setIsSavingDefault(false);
    if (result.ok) {
      setLocalDefaultType(next);
      setSuccess(result.successMessage);
    } else {
      setError(
        result.error ??
          "Could not change default base. Check that the chosen base is saved first."
      );
    }
  };

  const onPickEditTab = (tab: EditTab) => {
    setEditTab(tab);
    setSuccess(null);
    setError(null);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.sectionHeading}>Editing base</Text>
        <Text style={styles.sectionCaption}>
          Used for address fields below:{" "}
          <Text style={styles.sectionCaptionEmphasis}>{editTab}</Text>
        </Text>
        <View style={styles.row}>
          <Pressable
            style={[
              styles.typeButton,
              editTab === "Home" && styles.typeButtonActive,
            ]}
            onPress={() => onPickEditTab("Home")}
          >
            <Text
              style={[
                styles.typeButtonText,
                editTab === "Home" && styles.typeButtonTextActive,
              ]}
            >
              Home
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.typeButton,
              editTab === "Office" && styles.typeButtonActive,
            ]}
            onPress={() => onPickEditTab("Office")}
          >
            <Text
              style={[
                styles.typeButtonText,
                editTab === "Office" && styles.typeButtonTextActive,
              ]}
            >
              Office
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionHeading}>
          Used for travel and end-of-shift calculations
        </Text>
        <Text style={styles.sectionCaption}>
          Active default:{" "}
          <Text style={styles.sectionCaptionEmphasis}>
            {localDefaultType === "office" ? "Office" : "Home"}
          </Text>
        </Text>
        <Text style={styles.hint}>
          Tap Home or Office to set which base is used for return-time estimates.
          This is saved to the database immediately (separate from the address
          fields below).
        </Text>
        <View style={styles.row}>
          <Pressable
            style={[
              styles.typeButton,
              localDefaultType === "home" && styles.typeButtonActiveDefault,
            ]}
            onPress={() => void handleDefaultTypePress("home")}
            disabled={isSavingDefault}
          >
            <Text
              style={[
                styles.typeButtonText,
                localDefaultType === "home" && styles.typeButtonTextActive,
              ]}
            >
              Home
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.typeButton,
              localDefaultType === "office" && styles.typeButtonActiveDefault,
            ]}
            onPress={() => void handleDefaultTypePress("office")}
            disabled={isSavingDefault}
          >
            <Text
              style={[
                styles.typeButtonText,
                localDefaultType === "office" && styles.typeButtonTextActive,
              ]}
            >
              Office
            </Text>
          </Pressable>
        </View>
        {isSavingDefault ? (
          <ActivityIndicator style={styles.defaultSpinner} color="#2563eb" />
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.label}>Address ({editTab})</Text>
        <Text style={styles.hint}>
          Enter a full address and save — we look up map coordinates automatically. You
          can also enter latitude and longitude below instead.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 700 Douglas Ave, Providence, RI 02908"
          placeholderTextColor="#94a3b8"
          value={address}
          onChangeText={setAddress}
          autoCapitalize="words"
          autoComplete="street-address"
        />

        <Text style={styles.label}>Latitude (optional if address above)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 34.0522"
          placeholderTextColor="#94a3b8"
          value={latitudeStr}
          onChangeText={setLatitudeStr}
          keyboardType="decimal-pad"
          autoComplete="off"
        />

        <Text style={styles.label}>Longitude (optional if address above)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. -118.2437"
          placeholderTextColor="#94a3b8"
          value={longitudeStr}
          onChangeText={setLongitudeStr}
          keyboardType="decimal-pad"
          autoComplete="off"
        />

        {success ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, isSavingBase && styles.buttonDisabled]}
          onPress={() => void handleSaveActiveBase()}
          disabled={isSavingBase}
        >
          {isSavingBase ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Save {editTab} base only
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
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
    marginTop: 8,
  },
  sectionCaption: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 10,
  },
  sectionCaptionEmphasis: {
    fontWeight: "700",
    color: "#334155",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    marginTop: 16,
  },
  hint: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 10,
    lineHeight: 18,
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
  /** Slightly different tint so "editing" vs "default" rows are distinguishable */
  typeButtonActiveDefault: {
    backgroundColor: "#0d9488",
    borderColor: "#0d9488",
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  defaultSpinner: {
    marginTop: 8,
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
  successBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  successText: {
    fontSize: 14,
    color: "#065f46",
    lineHeight: 20,
  },
  error: {
    fontSize: 14,
    color: "#dc2626",
    marginTop: 12,
  },
  button: {
    marginTop: 16,
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
