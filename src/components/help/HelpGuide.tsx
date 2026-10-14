import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/layout";

type Entry = { title: string; body: string };
const driver: Entry[] = [
  { title: "1. Activate your account", body: "An administrator creates your account and sends your activation link. Open it on your iPhone, choose a password, then enter your own name and contact number. Drivers cannot create accounts themselves." },
  { title: "2. Check your approved locations", body: "An administrator sets Home and/or Office return locations. You can see these addresses, but only an administrator may edit them. Contact the office if an address is wrong." },
  { title: "3. Allow location access", body: "Enable Always Allow location access and background location. Your GPS is used during active shifts to capture route evidence and confirm return to an approved base when the company enables automated closing." },
  { title: "4. Start a shift", body: "Open Home and tap Start Shift when authorized and ready to work. Verify the shift timer appears. If GPS or onboarding is incomplete, follow the on-screen instructions or contact your administrator." },
  { title: "5. During your shift", body: "Keep location available, and check the Shift tab for tracking status. If the signal is poor or your phone restarts, reopen the app and notify your administrator. Do not assume missing GPS automatically proves you were not working." },
  { title: "6. Finish and review your hours", body: "The company is piloting return-to-base GPS clock-out. Automatic payroll closure is not enabled yet. Return to an approved location, check your shift status, and alert your administrator if the shift stays open. The office reviews exceptions before payroll decisions." },
  { title: "What if something looks wrong?", body: "Report incorrect hours, locations, a stuck shift, or an activation problem to your administrator. Do not try to change a base address or manipulate timestamps yourself." },
];
const admin: Entry[] = [
  { title: "1. Create a driver", body: "Select Create Driver, enter the employee’s real email, and send the invitation only with their consent. The employee chooses their own password and completes personal information. Never request or store their password." },
  { title: "2. Set approved GPS bases", body: "Open the driver profile to set Home and/or Office location. Confirm both the address and map coordinates with the employee. Drivers cannot edit an approved base." },
  { title: "3. Understand the status", body: "Open: GPS shift is not clocked out. Flagged: the record needs investigation. Recorded: raw historical calculation, not payroll approval. Explicitly approved: a documented administrator decision. Rejected or Test: excluded from approved totals." },
  { title: "4. Review unusual GPS", body: "Open a shift and compare its timestamps, accuracy, raw coordinates, route and base. A faraway city or single anomalous reading may come from a simulation, stale data or geocoding. It is not proof of employee misconduct." },
  { title: "5. Handle a stuck open shift", body: "Investigate the route and clock-in, then choose a documented end time and reason to close it for review. This frees the driver for another shift, but does not approve payroll. A separate action is required for recovery approval. Never invent an end time." },
  { title: "6. Make a historical payroll decision", body: "Open Shift Review Center. Approve only documented payable minutes, reject a nonpayable record, mark a known test as excluded, or return the decision to review. Every decision is logged and does not erase the original shift." },
  { title: "7. Investigate old test shifts", body: "Do not delete or bulk-approve historical shifts. Identify true test records, document why they are tests and archive them through the secure test-excluded decision. Real employee hours must remain preserved and investigated separately." },
  { title: "8. Weekly hours and exports", body: "The approved view excludes rejected, test and unreviewed entries. Legacy recorded values may still appear as evidence. Verify the secure payroll ledger has been deployed before using new reviewed totals for business reporting." },
  { title: "Privacy and support", body: "Share access only with authorized managers. Do not email route histories or employee personal data to unauthorized people. Seek internal support when an app or GPS problem affects a worker’s recorded time." },
];
export function HelpGuide({ role }: { role: "admin" | "driver" }) {
  const entries = role === "admin" ? admin : driver;
  const [expanded, setExpanded] = useState<number[]>([0]);
  return (
    <ScreenContainer>
      <Text style={styles.heading}>{role === "admin" ? "Administrator Guide" : "Driver Guide"}</Text>
      <Text style={styles.intro}>Quick instructions for your First Choice Transportation account. Select any topic to read more.</Text>
      {entries.map((entry, index) => {
        const open = expanded.includes(index);
        return (
          <View key={index} style={styles.card}>
            <Pressable onPress={() => setExpanded((before) => open
              ? before.filter((x) => x !== index) : [...before, index])}
              accessibilityRole="button" accessibilityState={{ expanded: open }}>
              <Text style={styles.title}>{entry.title} {open ? "−" : "+"}</Text>
            </Pressable>
            {open && <Text style={styles.body}>{entry.body}</Text>}
          </View>
        );
      })}
      <Pressable style={styles.support} onPress={() => Linking.openURL("https://firstchoicetransportation.netlify.app/support")}>
        <Text style={styles.supportLabel}>Open support and contact information ↗</Text>
      </Pressable>
      <Text style={styles.note}>This guide explains the current pilot workflow. Administrators must verify any disputed hours against supporting evidence.</Text>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  intro: { fontSize: 14, color: "#475569", lineHeight: 22, marginBottom: 18 },
  card: { backgroundColor: "#f8fafc", padding: 15, borderWidth: 1, borderColor: "#dbe3ed", borderRadius: 12, marginBottom: 11 },
  title: { fontSize: 16, fontWeight: "600", color: "#1e3a8a", lineHeight: 23 },
  body: { fontSize: 14, color: "#334155", lineHeight: 22, marginTop: 10 },
  support: { backgroundColor: "#315eea", borderRadius: 10, padding: 16, marginTop: 15 },
  supportLabel: { color: "#fff", fontSize: 15, fontWeight: "600", textAlign: "center" },
  note: { fontSize: 12, lineHeight: 19, color: "#64748b", marginTop: 14 },
});
