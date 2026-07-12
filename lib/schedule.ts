import type { ScheduleItem } from "@/types/database";

// v1 recurrence is intentionally minimal: "daily" fires every day, "weekly"
// fires on whatever weekday the coach originally created it on. If usage
// shows a need for coach-picked weekdays, add a `days_of_week int[]` column
// and swap this function's weekly branch — nothing else has to change.
export function isDueToday(item: ScheduleItem, today: Date): boolean {
  if (item.recurrence_rule === "daily") return true;
  if (item.recurrence_rule === "weekly") {
    return new Date(item.created_at).getDay() === today.getDay();
  }
  return false; // "once" items are surfaced via the schedule list, not the dashboard checklist
}
