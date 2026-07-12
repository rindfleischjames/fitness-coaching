import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { computeMonthlyAdherence } from "@/lib/adherence";
import { initials } from "@/lib/initials";
import { inviteClient } from "@/lib/actions/coach";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clients } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const clientIds = (clients ?? []).map((c) => c.id);

  const [{ data: allSchedule }, { data: allCompletions }, { data: lastWeighIns }, { data: invites }] =
    await Promise.all([
      clientIds.length
        ? supabase.from("schedule_items").select("*").in("client_id", clientIds)
        : Promise.resolve({ data: [] as any[] }),
      clientIds.length
        ? supabase
            .from("schedule_completions")
            .select("schedule_item_id, date, schedule_items!inner(client_id)")
            .gte("date", `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`)
        : Promise.resolve({ data: [] as any[] }),
      clientIds.length
        ? supabase.from("weigh_ins").select("client_id, date").in("client_id", clientIds).order("date", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("invites").select("*").is("accepted_at", null).order("created_at", { ascending: false }),
    ]);

  const today = new Date();
  const lastCheckinByClient = new Map<string, string>();
  for (const w of lastWeighIns ?? []) {
    if (!lastCheckinByClient.has(w.client_id)) lastCheckinByClient.set(w.client_id, w.date);
  }

  const rows = (clients ?? []).map((client) => {
    const items = (allSchedule ?? []).filter((s: any) => s.client_id === client.id);
    const completedSet = new Set(
      (allCompletions ?? [])
        .filter((c: any) => c.schedule_items?.client_id === client.id)
        .map((c: any) => `${c.schedule_item_id}|${c.date}`)
    );
    const adherence = computeMonthlyAdherence(items, completedSet, today);
    const total = adherence.complete + adherence.missed;
    const pct = total > 0 ? Math.round((adherence.complete / total) * 100) : 100;
    const lastCheckin = lastCheckinByClient.get(client.id);
    const daysSince = lastCheckin ? Math.round((Date.now() - new Date(lastCheckin).getTime()) / 86400000) : null;
    const needsAttention = daysSince == null ? items.length > 0 : daysSince > 3 || pct < 70;

    return { client, pct, lastCheckin, daysSince, needsAttention };
  });

  return (
    <>
      <div>
        <h1 className="page-heading">Roster</h1>
        <p className="muted">{rows.length} active client{rows.length === 1 ? "" : "s"}</p>
      </div>

      <div className="card card-solid">
        <form action={inviteClient} style={{ display: "flex", gap: 10 }}>
          <input type="email" name="email" placeholder="client@email.com" required style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", background: "var(--surface-1)" }} />
          <button className="btn btn-accent" type="submit">Invite client</button>
        </form>
        {(invites ?? []).length > 0 && (
          <p className="hint" style={{ marginTop: 10 }}>
            Pending: {(invites ?? []).map((i) => i.email).join(", ")}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="empty-state">No clients yet — invite your first one above.</p>
      ) : (
        <div className="card card-solid" style={{ padding: "4px 20px" }}>
          {rows.map(({ client, pct, lastCheckin, daysSince, needsAttention }) => (
            <Link key={client.id} href={`/coach/clients/${client.id}`} className="roster-item">
              <div className="avatar">{initials(client.full_name, client.email)}</div>
              <div>
                <div className="roster-name">{client.full_name || client.email}</div>
                <div className="roster-meta">
                  {lastCheckin ? `Checked in ${daysSince === 0 ? "today" : `${daysSince}d ago`}` : "No check-ins yet"}
                </div>
              </div>
              <div>
                <div className="adherence-bar"><i style={{ width: `${pct}%` }} /></div>
                <span className="adherence-pct">{pct}%</span>
              </div>
              <span className={`pill ${needsAttention ? "pill-crit" : "pill-good"}`}>
                {needsAttention ? "Needs attention" : "On track"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
