import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isDueToday } from "@/lib/schedule";
import { computeMonthlyAdherence } from "@/lib/adherence";
import { displayWeight } from "@/lib/units";
import { todayISODate, relativeDay } from "@/lib/format";
import ChecklistItem from "@/components/ChecklistItem";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const tz = profile.timezone || "UTC";
  const today = new Date();
  const todayISO = todayISODate(tz);

  const [{ data: scheduleItems }, { data: completions }, { data: booking }, { data: weighIns }] =
    await Promise.all([
      supabase.from("schedule_items").select("*").eq("client_id", user.id),
      supabase
        .from("schedule_completions")
        .select("schedule_item_id, date")
        .gte("date", `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`),
      supabase
        .from("bookings")
        .select("*")
        .eq("client_id", user.id)
        .eq("status", "confirmed")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("weigh_ins")
        .select("date, weight_kg")
        .eq("client_id", user.id)
        .order("date", { ascending: true })
        .limit(60),
    ]);

  const items = scheduleItems ?? [];
  const dueToday = items.filter((item) => isDueToday(item, today));
  const completedToday = new Set(
    (completions ?? []).filter((c) => c.date === todayISO).map((c) => c.schedule_item_id)
  );
  const doneCount = dueToday.filter((i) => completedToday.has(i.id)).length;

  const completedSet = new Set((completions ?? []).map((c) => `${c.schedule_item_id}|${c.date}`));
  const adherence = computeMonthlyAdherence(items, completedSet, today);

  const unit = profile.preferred_unit;
  let deltaCaption: string | null = null;
  if (weighIns && weighIns.length >= 2) {
    const recent = weighIns.filter((w) => {
      const days = (Date.now() - new Date(w.date).getTime()) / 86400000;
      return days <= 30;
    });
    if (recent.length >= 2) {
      const delta = displayWeight(recent[recent.length - 1].weight_kg, unit) - displayWeight(recent[0].weight_kg, unit);
      deltaCaption = `${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${unit} since ${new Date(recent[0].date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
  }

  const ringPct = dueToday.length ? doneCount / dueToday.length : 0;
  const circumference = 2 * Math.PI * 24;

  return (
    <>
      <div>
        <div className="hint">{today.toLocaleDateString(undefined, { timeZone: tz, weekday: "long", month: "long", day: "numeric" })}</div>
        <h1 className="page-heading">Good {greeting(today, tz)}, {profile.full_name?.split(" ")[0] ?? "there"}</h1>
      </div>

      {booking && (
        <div className="card">
          <div className="card-row">
            <div>
              <div className="card-title">Next call</div>
              <div className="card-meta">
                {relativeDay(booking.start_time, tz)} ·{" "}
                {new Date(booking.start_time).toLocaleTimeString(undefined, { timeZone: tz, hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
            {booking.zoom_link && (
              <a href={booking.zoom_link} target="_blank" rel="noreferrer" className="btn btn-accent">
                Join Zoom
              </a>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Today</div>
        {dueToday.length === 0 ? (
          <p className="empty-state">Nothing scheduled today.</p>
        ) : (
          <div className="checklist">
            {dueToday.map((item) => (
              <ChecklistItem key={item.id} item={item} date={todayISO} done={completedToday.has(item.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="card card-solid">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="56" height="56" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
            <circle
              cx="30"
              cy="30"
              r="24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference.toFixed(1)}
              strokeDashoffset={(circumference * (1 - ringPct)).toFixed(1)}
              transform="rotate(-90 30 30)"
            />
            <text x="30" y="34" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink-900)">
              {doneCount}/{dueToday.length}
            </text>
          </svg>
          {deltaCaption && (
            <div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: deltaCaption.startsWith("+") ? "var(--warning)" : "var(--good)" }}>
                {deltaCaption.split(" ").slice(0, 2).join(" ")}
              </div>
              <div className="hint" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {deltaCaption.split(" ").slice(2).join(" ")}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <b>{adherence.complete}</b>
          <span>Complete</span>
        </div>
        <div className="stat-tile">
          <b style={{ color: adherence.missed > 0 ? "var(--warning)" : undefined }}>{adherence.missed}</b>
          <span>Missed</span>
        </div>
        <div className="stat-tile">
          <b>{adherence.upcoming}</b>
          <span>Upcoming</span>
        </div>
      </div>
    </>
  );
}

function greeting(d: Date, tz: string) {
  const hour = Number(d.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }));
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
