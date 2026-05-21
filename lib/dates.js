// Browser-local date helpers — these respect the user's clock, not UTC.
// Use these everywhere instead of `new Date().toISOString().slice(0,10)`.

export function localToday(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Monday-of-week as YYYY-MM-DD (local time).
export function localWeekStart(d = new Date()) {
  const date = new Date(d);
  const dow = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - dow);
  return localToday(date);
}
