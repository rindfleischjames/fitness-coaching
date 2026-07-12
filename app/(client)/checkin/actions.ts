"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toKg } from "@/lib/units";
import { isDueToday } from "@/lib/schedule";
import { todayISODate } from "@/lib/format";

export async function submitCheckin(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user!.id).single();
  const tz = profile?.timezone || "UTC";
  const date = todayISODate(tz);

  const unit = (formData.get("unit") as "lbs" | "kg") || "lbs";
  const rawWeight = Number(formData.get("weight"));
  const fasted = formData.get("fasted") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const files = formData.getAll("photos") as File[];

  if (!rawWeight || rawWeight <= 0) {
    redirect("/checkin?error=weight");
  }

  const photoUrls: string[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const path = `${user!.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("check-in-photos").upload(path, file, {
      contentType: file.type,
    });
    if (!error) photoUrls.push(path);
  }

  await supabase.from("weigh_ins").insert({
    client_id: user!.id,
    date,
    weight_kg: toKg(rawWeight, unit),
    photo_urls: photoUrls,
    notes,
    fasted,
  });

  // Auto-complete today's matching schedule item(s), if the coach has one set up.
  const { data: scheduleItems } = await supabase.from("schedule_items").select("*").eq("client_id", user!.id);
  const today = new Date();
  const matchCategory = photoUrls.length > 0 ? "photo_checkin" : "weigh_in";
  const toComplete = (scheduleItems ?? []).filter(
    (item) => item.category === matchCategory && isDueToday(item, today)
  );
  for (const item of toComplete) {
    await supabase.from("schedule_completions").insert({ schedule_item_id: item.id, date }).select();
  }

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/schedule");
  redirect("/progress");
}
