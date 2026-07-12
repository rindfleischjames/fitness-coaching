import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, consent_accepted_at")
    .eq("id", user.id)
    .single();

  if (profile?.role === "client" && !profile.consent_accepted_at) redirect("/onboarding");
  redirect(profile?.role === "coach" ? "/coach" : "/dashboard");
}
