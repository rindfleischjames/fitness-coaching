"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchUpcomingBookings, matchClientByEmail } from "@/lib/cal";

export async function syncCalBookings() {
  const supabase = await createClient();
  const bookings = await fetchUpcomingBookings();
  if (bookings.length === 0) return;

  const { data: clients } = await supabase.from("profiles").select("id, email").eq("role", "client");

  for (const b of bookings) {
    const client = matchClientByEmail(clients ?? [], b.attendeeEmail);
    await supabase.from("bookings").upsert(
      {
        cal_com_event_id: b.id,
        client_id: client?.id ?? null,
        title: b.title,
        start_time: b.startTime,
        end_time: b.endTime,
        zoom_link: b.zoomLink,
        status: b.status === "cancelled" ? "cancelled" : "confirmed",
      },
      { onConflict: "cal_com_event_id" }
    );
  }

  revalidatePath("/coach/calendar");
  revalidatePath("/dashboard");
}
