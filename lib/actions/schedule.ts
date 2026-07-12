"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleCompletion(scheduleItemId: string, date: string, currentlyDone: boolean) {
  const supabase = await createClient();

  if (currentlyDone) {
    await supabase
      .from("schedule_completions")
      .delete()
      .eq("schedule_item_id", scheduleItemId)
      .eq("date", date);
  } else {
    await supabase.from("schedule_completions").insert({ schedule_item_id: scheduleItemId, date });
  }

  revalidatePath("/dashboard");
  revalidatePath("/schedule");
}
