import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { syncCalBookings } from "@/lib/actions/calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  const clientIds = Array.from(new Set((bookings ?? []).map((b) => b.client_id).filter(Boolean))) as string[];
  const { data: clients } = clientIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", clientIds)
    : { data: [] as any[] };
  const nameById = new Map((clients ?? []).map((c) => [c.id, c.full_name || c.email]));

  const configured = Boolean(process.env.CAL_COM_API_KEY);

  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings ?? []) {
    const key = new Date(b.start_time).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(b);
  }

  return (
    <>
      <div className="card-row">
        <div>
          <h1 className="page-heading">My Calendar</h1>
          <p className="muted">Synced from Cal.com — coach-managed, no client self-booking.</p>
        </div>
        <form action={syncCalBookings}>
          <button className="btn btn-accent" type="submit">Sync now</button>
        </form>
      </div>

      {!configured && (
        <div className="card">
          <p className="card-meta">
            Add <code className="mono">CAL_COM_API_KEY</code> to your environment to pull real bookings. See the README.
          </p>
        </div>
      )}

      {(bookings ?? []).length === 0 ? (
        <p className="empty-state">No upcoming calls. Book one in Cal.com, then hit Sync.</p>
      ) : (
        Array.from(byDay.entries()).map(([day, items]) => (
          <div key={day} className="card card-solid">
            <div className="eyebrow" style={{ marginBottom: 6 }}>{day}</div>
            {items!.map((b) => (
              <div key={b.id} className="cal-item">
                <div className="cal-time">
                  {new Date(b.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
                <div className="cal-body">
                  <div className="cal-name">{b.client_id ? nameById.get(b.client_id) ?? "Unmatched client" : b.title}</div>
                  <div className="cal-sub">{b.title}</div>
                  {b.zoom_link && (
                    <a href={b.zoom_link} target="_blank" rel="noreferrer" className="btn btn-accent" style={{ fontSize: 11, padding: "6px 12px" }}>
                      Join Zoom
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
}
