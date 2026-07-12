"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createScheduleItem(clientId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "habit");
  const recurrence_rule = String(formData.get("recurrence_rule") ?? "daily");
  const time_of_day = String(formData.get("time_of_day") ?? "09:00");
  if (!title) return;

  await supabase.from("schedule_items").insert({
    client_id: clientId,
    title,
    category: category as any,
    recurrence_rule: recurrence_rule as any,
    time_of_day,
  });

  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
}

export async function deleteScheduleItem(itemId: string, clientId: string) {
  const supabase = await createClient();
  await supabase.from("schedule_items").delete().eq("id", itemId);
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
}
