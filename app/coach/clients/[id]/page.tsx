import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WeightChart from "@/components/WeightChart";
import CompareView from "@/components/CompareView";
import { signOneUrl } from "@/lib/storage";
import { displayWeight } from "@/lib/units";
import { createGoal, archiveGoal } from "@/lib/actions/goals";
import { saveCoachNote } from "@/lib/actions/notes";
import { archiveClient, reactivateClient } from "@/lib/actions/coach";
import { createScheduleItem, deleteScheduleItem } from "@/lib/actions/schedule-builder";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: client }, { data: weighIns }, { data: goals }, { data: note }, { data: scheduleItems }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("weigh_ins").select("*").eq("client_id", id).order("date", { ascending: true }),
    supabase.from("goals").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("coach_notes").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("schedule_items").select("*").eq("client_id", id).order("time_of_day", { ascending: true }),
  ]);

  if (!client) notFound();

  const unit = client.preferred_unit;
  const all = weighIns ?? [];
  const chartPoints = all.map((w) => ({ date: w.date, weight_kg: w.weight_kg }));
  const activeGoal = (goals ?? []).find((g) => g.status === "active" && g.type === "weight");
  const withPhotos = all.filter((w) => w.photo_urls.length > 0).reverse();
  const thumbUrls = await Promise.all(withPhotos.map((w) => signOneUrl(supabase, w.photo_urls[0])));
  const compareOptions = withPhotos.map((w, i) => ({
    date: w.date,
    label: new Date(w.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    url: thumbUrls[i] ?? "",
  })).filter((c) => c.url);

  const archiveAction = client.archived_at ? reactivateClient.bind(null, client.id) : archiveClient.bind(null, client.id);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Link href="/coach" className="hint">← Roster</Link>
          <h1 className="page-heading" style={{ marginTop: 6 }}>{client.full_name || client.email}</h1>
          <p className="muted">{client.email}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/coach/messages/${client.id}`} className="btn btn-ghost">Message</Link>
          <form action={archiveAction}>
            <button className="btn btn-plain" type="submit">{client.archived_at ? "Reactivate" : "Archive"}</button>
          </form>
        </div>
      </div>

      <WeightChart points={chartPoints} unit={unit} goalKg={activeGoal?.target_value ?? null} />

      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Photo timeline</div>
        {withPhotos.length === 0 ? (
          <p className="empty-state">No progress photos yet.</p>
        ) : (
          <div className="photo-strip">
            {withPhotos.map((w, i) => (
              <div key={w.id} className="thumb">
                {thumbUrls[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrls[i]!} alt="" />
                )}
                <span>{new Date(w.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {compareOptions.length >= 2 && <CompareView options={compareOptions} />}

      <div>
        <div className="section-title">Schedule</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {(scheduleItems ?? []).map((item) => (
            <div key={item.id} className="card card-row">
              <div>
                <div className="card-title">{item.title}</div>
                <div className="card-meta">
                  {item.time_of_day.slice(0, 5)} · {item.recurrence_rule} · {item.category.replace("_", " ")}
                </div>
              </div>
              <form action={deleteScheduleItem.bind(null, item.id, client.id)}>
                <button className="btn btn-plain" style={{ fontSize: 11, padding: "5px 10px" }} type="submit">Remove</button>
              </form>
            </div>
          ))}
          {(scheduleItems ?? []).length === 0 && <p className="hint">No scheduled tasks yet.</p>}
        </div>

        <form action={createScheduleItem.bind(null, client.id)} className="card card-solid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="card-title">Add a task</div>
          <div className="field">
            <label>Title</label>
            <input type="text" name="title" placeholder="Daily weigh-in" required />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Category</label>
              <select name="category" defaultValue="weigh_in">
                <option value="weigh_in">Weigh-in</option>
                <option value="photo_checkin">Progress photos</option>
                <option value="habit">Habit</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Repeats</label>
              <select name="recurrence_rule" defaultValue="daily">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="field" style={{ width: 100 }}>
              <label>Time</label>
              <input type="time" name="time_of_day" defaultValue="09:00" />
            </div>
          </div>
          <button className="btn btn-accent" type="submit" style={{ alignSelf: "flex-start" }}>Add to schedule</button>
        </form>
      </div>

      <div>
        <div className="card-row" style={{ marginBottom: 10 }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Goals</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {(goals ?? []).filter((g) => g.status === "active").map((g) => (
            <div key={g.id} className="card card-row">
              <div>
                <div className="card-title">
                  {g.type === "weight" && g.target_value != null
                    ? `Reach ${displayWeight(g.target_value, unit)} ${unit}`
                    : "Habit goal"}
                </div>
                {g.target_date && <div className="card-meta">by {new Date(g.target_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>}
              </div>
              <form action={archiveGoal.bind(null, g.id, client.id)}>
                <button className="btn btn-plain" style={{ fontSize: 11, padding: "5px 10px" }} type="submit">Archive</button>
              </form>
            </div>
          ))}
          {(goals ?? []).filter((g) => g.status === "active").length === 0 && (
            <p className="hint">No active goal set.</p>
          )}
        </div>

        <form action={createGoal.bind(null, client.id)} className="card card-solid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="card-title">Set a new goal</div>
          <input type="hidden" name="type" value="weight" />
          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Target weight</label>
              <input type="number" step="0.1" name="target_value" placeholder="185" />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label>Unit</label>
              <select name="unit" defaultValue={unit}>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Target date</label>
            <input type="date" name="target_date" />
          </div>
          <button className="btn btn-accent" type="submit">Save goal</button>
        </form>
      </div>

      <div>
        <div className="section-title">Private notes</div>
        <p className="hint" style={{ marginBottom: 10 }}>Only visible to you — never shown to {client.full_name?.split(" ")[0] || "this client"}.</p>
        <form action={saveCoachNote.bind(null, client.id)} className="field">
          <textarea name="body" defaultValue={note?.body ?? ""} rows={4} placeholder="Mentioned knee pain, prefers evening reminders…" />
          <button className="btn btn-plain" type="submit" style={{ alignSelf: "flex-start" }}>Save note</button>
        </form>
      </div>
    </>
  );
}
