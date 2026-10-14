import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type Mode = "date" | "time";

export function ReviewedEndTimePicker({
  clockIn, value, onChange,
}: {
  clockIn: string;
  value: Date | null;
  onChange: (date: Date) => void;
}) {
  const [visibleMode, setVisibleMode] = useState<Mode | null>(null);
  const [draft, setDraft] = useState<Date | null>(null);
  const start = new Date(clockIn);
  const end = new Date(Math.min(Date.now(), start.getTime() + 24 * 60 * 60 * 1000));
  const fallback = new Date(Math.min(end.getTime(), start.getTime() + 60 * 60 * 1000));
  const selected = draft ?? value ?? fallback;
  const validBounds = Number.isFinite(start.getTime()) && end >= start;

  const combine = (mode: Mode, next: Date) => {
    const combined = new Date(selected);
    if (mode === "date") {
      combined.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
    } else {
      combined.setHours(next.getHours(), next.getMinutes(), 0, 0);
    }
    return combined;
  };

  const commit = (next: Date) => {
    if (next >= start && next <= end) {
      onChange(next);
      setDraft(null);
      return;
    }
    setDraft(next);
  };

  if (!validBounds) {
    return <Text style={styles.error}>This shift has invalid or future timestamps. Contact support before closing it.</Text>;
  }
  return (
    <View style={styles.area}>
      <Text style={styles.title}>Reviewed clock-out (device local time)</Text>
      <Text style={styles.note}>Choose the actual supported end date and time. A suggested value is never submitted until you select it.</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.action} onPress={() => setVisibleMode("date")}>
          <Text style={styles.actionText}>Choose date</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.action} onPress={() => setVisibleMode("time")}>
          <Text style={styles.actionText}>Choose time</Text>
        </Pressable>
      </View>
      {visibleMode && (
        <View>
          <DateTimePicker
            value={selected}
            mode={visibleMode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              if (event.type === "dismissed" || !date) {
                setVisibleMode(null);
                setDraft(null);
                return;
              }
              const next = combine(visibleMode, date);
              if (Platform.OS === "ios") {
                setDraft(next);
                return;
              }
              setVisibleMode(null);
              commit(next);
            }}
            minimumDate={visibleMode === "date" ? start : undefined}
            maximumDate={visibleMode === "date" ? end : undefined}
            is24Hour
          />
          {Platform.OS === "ios" && (
            <Pressable accessibilityRole="button" style={styles.done} onPress={() => {
              if (draft) commit(draft);
              setVisibleMode(null);
            }}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
      {value ? (
        <>
          <Text style={styles.selected}>Selected: {value.toLocaleString()}</Text>
          <Text selectable style={styles.note}>Audit timestamp: {value.toISOString()}</Text>
          {(value < start || value > end) &&
            <Text style={styles.error}>Choose a time after clock-in and within 24 hours of the start.</Text>}
        </>
      ) : <Text style={styles.note}>No reviewed end time selected.</Text>}
      {draft && (draft < start || draft > end) &&
        <Text style={styles.error}>Choose a time after clock-in and within 24 hours of the start.</Text>}
      <Text style={styles.note}>Time zone from this phone: {Intl.DateTimeFormat().resolvedOptions().timeZone || "device local"}.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  area: { gap: 10 }, title: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  note: { color: "#64748b", fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10 },
  action: { backgroundColor: "#eff6ff", padding: 11, borderRadius: 8, flex: 1, alignItems: "center" },
  actionText: { color: "#2256d8", fontWeight: "600" },
  done: { padding: 12, alignSelf: "flex-end" },
  doneText: { color: "#2256d8", fontWeight: "600" },
  selected: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  error: { color: "#b91c1c", fontSize: 13 },
});
