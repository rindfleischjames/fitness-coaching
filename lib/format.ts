export function formatDateInTz(iso: string, timeZone: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  });
}

export function todayISODate(timeZone: string) {
  // en-CA gives YYYY-MM-DD directly, which is what Postgres `date` expects.
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

// Attachment storage paths are "{folderId}/{uuid}-{originalFileName}" —
// crypto.randomUUID() is always 36 chars, so slicing past "uuid-" recovers
// the original name without a dedicated database column.
export function extractFileName(path: string): string {
  const last = path.split("/").pop() || "";
  return last.slice(37) || last;
}

export function relativeDay(iso: string, timeZone: string) {
  const now = new Date();
  const target = new Date(iso);
  const days = Math.round(
    (Date.parse(new Date(target).toLocaleDateString("en-CA", { timeZone })) -
      Date.parse(now.toLocaleDateString("en-CA", { timeZone }))) /
      86400000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return target.toLocaleDateString(undefined, { timeZone, weekday: "short", month: "short", day: "numeric" });
}
