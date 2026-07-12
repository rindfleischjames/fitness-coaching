import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MessageThread from "@/components/MessageThread";
import { signOneUrl } from "@/lib/storage";
import { extractFileName } from "@/lib/format";
import { markThreadRead } from "@/lib/actions/messages";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: thread } = await supabase.from("threads").select("*").eq("client_id", user.id).maybeSingle();

  if (!thread) {
    return (
      <>
        <h1 className="page-heading">Coach</h1>
        <p className="empty-state">Your coach hasn&apos;t started a thread yet.</p>
      </>
    );
  }

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
    <>
      <h1 className="page-heading">Coach</h1>
      <MessageThread threadId={thread.id} clientFolderId={user.id} currentUserId={user.id} messages={resolved} />
    </>
  );
}
