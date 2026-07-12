"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC");
  const preferredUnit = String(formData.get("preferred_unit") ?? "lbs");
  const consent = formData.get("consent") === "on";

  if (!consent) {
    redirect("/onboarding?error=consent");
  }

  await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      timezone,
      preferred_unit: preferredUnit as "lbs" | "kg",
      consent_accepted_at: new Date().toISOString(),
    })
    .eq("id", user!.id);

  redirect("/dashboard");
}
