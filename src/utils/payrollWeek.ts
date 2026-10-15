/** Payroll periods are Monday–Sunday in the company's New York time zone. */
export function easternPayrollWeekStart(now: Date, weeksAgo = 1): string {
  if (!Number.isInteger(weeksAgo) || weeksAgo < 0 || weeksAgo > 104)
    throw new Error("INVALID_WEEK_OFFSET");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const easternDay = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  const mondayOffset = (easternDay.getUTCDay() + 6) % 7;
  easternDay.setUTCDate(easternDay.getUTCDate() - mondayOffset - weeksAgo * 7);
  return easternDay.toISOString().slice(0, 10);
}

export function payrollWeekDisplay(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const pretty = (value: Date) =>
    value.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
  return pretty(start) + " – " + pretty(end) + ", " + end.getUTCFullYear();
}
