"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(threadId: string, clientFolderId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const body = String(formData.get("body") ?? "").trim();
  const file = formData.get("attachment") as File | null;

  let attachmentUrl: string | null = null;
  let attachmentType: "image" | "document" | null = null;

  if (file && file.size > 0) {
    const path = `${clientFolderId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("message-attachments").upload(path, file, {
      contentType: file.type,
    });
    if (!error) {
      attachmentUrl = path;
      attachmentType = file.type.startsWith("image/") ? "image" : "document";
    }
  }

  if (!body && !attachmentUrl) return;

  await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: user.id,
    body: body || null,
    attachment_url: attachmentUrl,
    attachment_type: attachmentType,
  });

  revalidatePath("/messages");
  revalidatePath("/coach/messages");
}

export async function markThreadRead(threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .is("read_at", null)
    .neq("sender_id", user.id);
}
