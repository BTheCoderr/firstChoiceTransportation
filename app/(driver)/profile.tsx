import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import {
  getDefaultBaseForDriver,
  upsertDefaultBase,
} from "@/services/driverBases";
import { DriverBaseForm } from "@/components/driver/DriverBaseForm";
import type { DriverBasesRow } from "@/types/database";

export default function DriverProfileScreen() {
  const { profile } = useAuth();
  const driverId = profile?.id;
  const [base, setBase] = useState<DriverBasesRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBase = useCallback(async () => {
    if (!driverId) return;
    const b = await getDefaultBaseForDriver(driverId);
    setBase(b);
  }, [driverId]);

  useEffect(() => {
    loadBase().finally(() => setIsLoading(false));
  }, [loadBase]);

  const handleSave = async (input: {
    name: "Home" | "Office";
    latitude: number;
    longitude: number;
    address: string | null;
  }): Promise<boolean> => {
    if (!driverId) return false;
    const result = await upsertDefaultBase({
      driverId,
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
    });
    if (result) {
      setBase(result);
      return true;
    }
    return false;
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Default base</Text>
      <Text style={styles.subtitle}>
        Set your home or office location. This is used when ending a shift to
        estimate travel time back.
      </Text>
      <DriverBaseForm
        driverId={driverId!}
        existingBase={base}
        onSave={handleSave}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
  },
});
