import type { ScheduleItem } from "@/types/database";
import { isDueToday } from "./schedule";

export interface MonthlyAdherence {
  complete: number;
  missed: number;
  upcoming: number;
}

// Walks every day of the current month (up to today) counting how many
// schedule instances were expected vs. actually completed, then counts the
// remaining expected instances through month end as "upcoming".
export function computeMonthlyAdherence(
  items: ScheduleItem[],
  completedDates: Set<string>, // "schedule_item_id|date" pairs
  today: Date
): MonthlyAdherence {
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let complete = 0;
  let missed = 0;
  let upcoming = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const iso = d.toISOString().slice(0, 10);
    const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const item of items) {
      if (!isDueToday(item, d)) continue;
      const key = `${item.id}|${iso}`;
      if (completedDates.has(key)) {
        complete++;
      } else if (isPast) {
        // Day is fully over and it wasn't done — a real miss.
        missed++;
      } else {
        // Today (not yet done — day isn't over) or a future date.
        upcoming++;
      }
    }
  }

  return { complete, missed, upcoming };
}
