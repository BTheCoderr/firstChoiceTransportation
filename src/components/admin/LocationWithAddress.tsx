import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Linking } from "react-native";
import { reverseGeocode, getMapsUrl } from "@/services/geocoding";

interface LocationWithAddressProps {
  latitude: number;
  longitude: number;
  timestamp?: string;
  label?: string;
}

export function LocationWithAddress({
  latitude,
  longitude,
  timestamp,
  label,
}: LocationWithAddressProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    reverseGeocode(latitude, longitude).then((a) => {
      if (!cancelled) {
        setAddress(a);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  const displayText = loading ? "Loading address…" : address ?? coords;
  const mapsUrl = getMapsUrl(latitude, longitude);

  const openMaps = () => {
    Linking.openURL(mapsUrl);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.coords}>
        {label && <Text style={styles.label}>{label} </Text>}
        {displayText}
        {timestamp && <Text style={styles.time}> @ {timestamp}</Text>}
      </Text>
      <Pressable style={styles.mapLink} onPress={openMaps}>
        <Text style={styles.mapLinkText}>Open in Maps</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontWeight: "600",
    color: "#475569",
  },
  coords: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  time: {
    color: "#64748b",
    fontSize: 12,
  },
  mapLink: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  mapLinkText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "500",
  },
});
