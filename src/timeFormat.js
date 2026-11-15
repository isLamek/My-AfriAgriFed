import { t, formatDate } from "./i18n";

// "just now", "5 min ago", "3 h ago", "2 days ago", or a date for older things.
export function formatRelativeTime(timestamp, { short = false } = {}) {
  if (!timestamp) return "";
  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return t("time.justNow");
  if (minutes < 60) return t(short ? "time.minutesAgoShort" : "time.minutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t(short ? "time.hoursAgoShort" : "time.hoursAgo", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return t(short ? "time.daysAgoShort" : "time.daysAgo", { count: days });
  return formatDate(timestamp);
}
