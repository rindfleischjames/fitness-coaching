"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toKg } from "@/lib/units";

export async function createGoal(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const type = String(formData.get("type") ?? "weight") as "weight" | "habit";
  const targetDate = String(formData.get("target_date") ?? "") || null;
  const rawTarget = formData.get("target_value");
  const unit = String(formData.get("unit") ?? "lbs") as "lbs" | "kg";

  await supabase.from("goals").insert({
    client_id: clientId,
    type,
    target_value: rawTarget ? toKg(Number(rawTarget), unit) : null,
    target_date: targetDate,
    created_by: user.id,
  });

  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/progress");
}

export async function archiveGoal(goalId: string, clientId: string) {
  const supabase = await createClient();
  await supabase.from("goals").update({ status: "archived" }).eq("id", goalId);
  revalidatePath(`/coach/clients/${clientId}`);
}
