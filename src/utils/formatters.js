export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function clock(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function dateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function shortDate(ymd) {
  // ymd = YYYY-MM-DD (UTC day)
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString([], { day: "numeric", month: "short", timeZone: "UTC" });
}

export function duration(seconds) {
  if (seconds == null) return "none yet";
  const m = Math.round(seconds / 60);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Risk is an uncalibrated score. Show it as 0 to 100, never as a probability. */
export const score100 = (x) => (x == null ? null : Math.round(x * 100));
export const percent = (x, digits = 0) => (x == null ? "none yet" : `${(x * 100).toFixed(digits)}%`);
export const initials = (name = "") => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
