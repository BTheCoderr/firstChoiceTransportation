import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SINGLE_COMPANY_ID } from "@/constants/company";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { AdminDriverCard } from "@/components/admin/AdminDriverCard";
import { AdminShiftListItem } from "@/components/admin/AdminShiftListItem";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { drivers, recentShifts, isLoading, refresh } =
    useAdminDashboard(SINGLE_COMPANY_ID);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDriverPress = (driverId: string) => {
    router.push(`/(admin)/driver/${driverId}`);
  };

  const handleShiftPress = (shiftId: string) => {
    router.push(`/(admin)/shift/${shiftId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.title}>Drivers</Text>
      {drivers.length === 0 ? (
        <Text style={styles.placeholder}>No drivers in your company.</Text>
      ) : (
        drivers.map((driver) => (
          <AdminDriverCard
            key={driver.id}
            driver={driver}
            onPress={() => handleDriverPress(driver.id)}
          />
        ))
      )}

      <Text style={styles.sectionTitle}>Recent shifts</Text>
      {recentShifts.length === 0 ? (
        <Text style={styles.placeholder}>No completed shifts yet.</Text>
      ) : (
        recentShifts.map((item) => (
          <AdminShiftListItem
            key={item.shift.id}
            item={item}
            onPress={() => handleShiftPress(item.shift.id)}
          />
        ))
      )}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#1e293b",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 32,
    marginBottom: 12,
    color: "#1e293b",
  },
  placeholder: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 12,
  },
});
