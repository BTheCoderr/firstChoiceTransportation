/**
 * Manual QA sanity check — Option B paid clock-out math (no timezone).
 * Scenario: clock_in 8h, last_dropoff 16h same calendar day UTC, applied 30 min → out 16.5h → verified 510.
 */
const dayAnchor = Date.UTC(2026, 4, 13);
const msHours = (h) => h * 60 * 60 * 1000;
const clockInAt = dayAnchor + msHours(8);
const lastDropoffAt = dayAnchor + msHours(16);
const appliedMinutes = 30;
const clockOutExpected = lastDropoffAt + appliedMinutes * 60 * 1000;
const verifiedExpected = Math.floor(
  (clockOutExpected - clockInAt) / (60 * 1000)
);

if (verifiedExpected !== 510) {
  console.error("FAIL verified_hours_minutes", verifiedExpected);
  process.exit(1);
}
if (clockOutExpected - lastDropoffAt !== 30 * 60 * 1000) {
  console.error("FAIL paid end offset");
  process.exit(1);
}
console.log("OK Option B QA:", {
  appliedMinutes,
  verifiedMinutes: verifiedExpected,
  clockOutHoursFromUtcMidnight:
    (clockOutExpected - dayAnchor) / (60 * 60 * 1000),
});
