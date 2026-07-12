import { toggleCompletion } from "@/lib/actions/schedule";
import type { ScheduleItem } from "@/types/database";

const categoryLabel: Record<string, string> = {
  weigh_in: "Weigh-in",
  photo_checkin: "Progress photos",
  habit: "Habit",
  call: "Call",
  other: "Task",
};

export default function ChecklistItem({
  item,
  date,
  done,
  interactive = true,
}: {
  item: ScheduleItem;
  date: string;
  done: boolean;
  interactive?: boolean;
}) {
  const meta = (
    <span className="check-meta">
      {item.time_of_day.slice(0, 5)} · {categoryLabel[item.category] ?? item.category}
    </span>
  );

  if (!interactive) {
    return (
      <div className="check-item">
        <span className={`check-box${done ? " done" : ""}`} />
        <div className="check-text">
          <span className="check-title">{item.title}</span>
          {meta}
        </div>
      </div>
    );
  }

  const action = toggleCompletion.bind(null, item.id, date, done);

  return (
    <form action={action} className="check-item">
      <button type="submit" className={`check-box${done ? " done" : ""}`} aria-label={done ? "Mark incomplete" : "Mark complete"} />
      <div className="check-text">
        <span className="check-title">{item.title}</span>
        {meta}
      </div>
    </form>
  );
}
