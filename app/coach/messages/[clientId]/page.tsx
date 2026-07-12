import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageThread from "@/components/MessageThread";
import { signOneUrl } from "@/lib/storage";
import { extractFileName } from "@/lib/format";
import { markThreadRead } from "@/lib/actions/messages";

export const dynamic = "force-dynamic";

export default async function CoachThreadPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: client }, { data: thread }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", clientId).single(),
    supabase.from("threads").select("*").eq("coach_id", user.id).eq("client_id", clientId).maybeSingle(),
  ]);

  if (!client || !thread) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  await markThreadRead(thread.id);

  const resolved = await Promise.all(
    (messages ?? []).map(async (m) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      attachmentUrl: m.attachment_url ? await signOneUrl(supabase, m.attachment_url, "message-attachments") : null,
      attachmentType: m.attachment_type,
      attachmentName: m.attachment_url ? extractFileName(m.attachment_url) : null,
      createdAt: m.created_at,
    }))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/coach/messages" className="hint">← Messages</Link>
        <h1 className="page-heading" style={{ marginTop: 6 }}>{client.full_name || client.email}</h1>
      </div>
      <MessageThread threadId={thread.id} clientFolderId={client.id} currentUserId={user.id} messages={resolved} />
    </div>
  );
}
