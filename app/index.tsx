import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function IndexScreen() {
  const router = useRouter();
  const { user, profile, role, isLoading, retryLoadProfile, signOut } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const id = setTimeout(() => {
      if (!user) {
        router.replace("/(auth)");
        return;
      }
      if (!profile) return;
      if (role === "driver") {
        router.replace("/(driver)");
        return;
      }
      if (role === "admin") {
        router.replace("/(admin)");
        return;
      }
      router.replace("/(auth)");
    }, 0);

    return () => clearTimeout(id);
  }, [user, profile, role, isLoading, router]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (user && !profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Profile Not Found</Text>
        <Text style={styles.errorText}>
          Your account could not be loaded. Please contact your administrator.
        </Text>
        <Pressable style={styles.retryButton} onPress={retryLoadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.loadingText}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#dc2626",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#2563eb",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#666",
  },
  signOutButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
