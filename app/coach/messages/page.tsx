import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { initials } from "@/lib/initials";

export const dynamic = "force-dynamic";

export default async function CoachMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: threads } = await supabase.from("threads").select("*, profiles!threads_client_id_fkey(*)").eq("coach_id", user.id);

  const threadIds = (threads ?? []).map((t) => t.id);
  const { data: messages } = threadIds.length
    ? await supabase
        .from("messages")
        .select("*")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  const rows = (threads ?? []).map((t: any) => {
    const threadMessages = (messages ?? []).filter((m) => m.thread_id === t.id);
    const last = threadMessages[0];
    const unread = threadMessages.filter((m) => m.sender_id !== user.id && !m.read_at).length;
    const client = t.profiles;
    return { thread: t, client, last, unread };
  });

  rows.sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));

  return (
    <>
      <h1 className="page-heading">Messages</h1>
      {rows.length === 0 ? (
        <p className="empty-state">No conversations yet.</p>
      ) : (
        <div className="card card-solid" style={{ padding: "4px 20px" }}>
          {rows.map(({ thread, client, last, unread }) => (
            <Link key={thread.id} href={`/coach/messages/${client.id}`} className="roster-item" style={{ gridTemplateColumns: "34px 1fr auto" }}>
              <div className="avatar">{initials(client.full_name, client.email)}</div>
              <div>
                <div className="roster-name">{client.full_name || client.email}</div>
                <div className="roster-meta" style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {last?.body ?? (last?.attachment_type === "document" ? "📎 Document" : last?.attachment_type === "image" ? "📷 Photo" : "No messages yet")}
                </div>
              </div>
              {unread > 0 && <span className="pill pill-crit">{unread} new</span>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
