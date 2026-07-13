"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getServerOrigin } from "@/lib/site-url";

export async function inviteClient(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${await getServerOrigin()}/auth/callback`,
  });

  if (!error) {
    await supabase.from("invites").insert({ email, coach_id: user.id });
  }

  revalidatePath("/coach");
}

export async function archiveClient(clientId: string) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ archived_at: new Date().toISOString() }).eq("id", clientId);
  revalidatePath("/coach");
}

export async function reactivateClient(clientId: string) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ archived_at: null }).eq("id", clientId);
  revalidatePath("/coach");
}
