/**
 * Format duration in minutes as "Xh Ym"
 */
export function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes < 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Compute elapsed minutes from clock_in_at to now (or to clock_out_at if set)
 */
export function getShiftElapsedMinutes(
  clockInAt: string,
  clockOutAt?: string | null
): number {
  const start = new Date(clockInAt).getTime();
  const end = clockOutAt ? new Date(clockOutAt).getTime() : Date.now();
  return Math.floor((end - start) / (60 * 1000));
}
