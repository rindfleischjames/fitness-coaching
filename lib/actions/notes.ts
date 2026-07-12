"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveCoachNote(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const body = String(formData.get("body") ?? "");

  await supabase
    .from("coach_notes")
    .upsert({ client_id: clientId, body, updated_at: new Date().toISOString() }, { onConflict: "client_id" });

  revalidatePath(`/coach/clients/${clientId}`);
}
