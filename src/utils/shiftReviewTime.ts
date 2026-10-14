/** Parse explicit local wall clock values without interpreting them as UTC. */
export function parseLocalReviewTime(dateText: string, timeText: string): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  const time = /^(\d{2}):(\d{2})$/.exec(timeText.trim());
  if (!day || !time) return null;
  const year = Number(day[1]), month = Number(day[2]), date = Number(day[3]);
  const hour = Number(time[1]), minute = Number(time[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || date < 1 || date > 31 ||
    hour > 23 || minute > 59) return null;
  const parsed = new Date(year, month - 1, date, hour, minute, 0, 0);
  // Reject overflow (invalid day) and nonexistent DST spring-forward local times.
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== date || parsed.getHours() !== hour || parsed.getMinutes() !== minute)
    return null;
  return parsed;
}
export function formatLocalReviewTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
