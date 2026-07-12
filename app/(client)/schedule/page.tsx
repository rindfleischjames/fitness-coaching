import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isDueToday } from "@/lib/schedule";
import { getWeekDates, toISODate } from "@/lib/week";
import ChecklistItem from "@/components/ChecklistItem";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "day";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const selected = params.date ? new Date(`${params.date}T00:00:00`) : new Date();
  const weekDates = getWeekDates(selected);

  const { data: scheduleItems } = await supabase.from("schedule_items").select("*").eq("client_id", user.id);
  const items = scheduleItems ?? [];

  const monthStart = toISODate(weekDates[0]);
  const monthEnd = toISODate(weekDates[6]);
  const { data: completions } = await supabase
    .from("schedule_completions")
    .select("schedule_item_id, date")
    .gte("date", monthStart)
    .lte("date", monthEnd);
  const completedSet = new Set((completions ?? []).map((c) => `${c.schedule_item_id}|${c.date}`));

  const weekLabel = `${weekDates[0].toLocaleDateString(undefined, { month: "long", day: "numeric" })} – ${weekDates[6].toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;
  const selectedISO = toISODate(selected);

  return (
    <>
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Link href={`/schedule?view=day&date=${selectedISO}`} className={`btn ${view === "day" ? "btn-accent" : "btn-plain"}`}>
            Day
          </Link>
          <Link href={`/schedule?view=week&date=${selectedISO}`} className={`btn ${view === "week" ? "btn-accent" : "btn-plain"}`}>
            Week
          </Link>
        </div>
        <h1 className="page-heading">Schedule</h1>
        <p className="muted">{view === "day" ? selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : weekLabel}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
        {weekDates.map((d) => {
          const iso = toISODate(d);
          const isSelected = iso === selectedISO;
          return (
            <Link
              key={iso}
              href={`/schedule?view=${view}&date=${iso}`}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 0",
                borderRadius: 10,
                background: isSelected ? "var(--accent)" : "transparent",
                color: isSelected ? "var(--surface-1)" : "var(--ink-600)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                {d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}
              </div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{d.getDate()}</div>
            </Link>
          );
        })}
      </div>

      {view === "day" ? (
        <DayList items={items} date={selected} completedSet={completedSet} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {weekDates.map((d) => (
            <div key={toISODate(d)}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                {d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </div>
              <DayList items={items} date={d} completedSet={completedSet} compact />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function DayList({
  items,
  date,
  completedSet,
  compact,
}: {
  items: any[];
  date: Date;
  completedSet: Set<string>;
  compact?: boolean;
}) {
  const iso = toISODate(date);
  const due = items.filter((item) => isDueToday(item, date));

  if (due.length === 0) {
    return <p className={compact ? "hint" : "empty-state"}>Nothing scheduled.</p>;
  }

  return (
    <div className="checklist">
      {due.map((item) => (
        <ChecklistItem key={item.id} item={item} date={iso} done={completedSet.has(`${item.id}|${iso}`)} />
      ))}
    </div>
  );
}
