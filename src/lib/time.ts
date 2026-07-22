/**
 * Formats a datetime string as a human-friendly relative time
 * (e.g. "just now", "5m ago", "2h ago", "Mon 14 Jul")
 */
export function formatRelative(dateStr: string): string {
  // SQLite returns UTC strings without the 'Z' suffix
  const normalized = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
  const date = new Date(normalized);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
