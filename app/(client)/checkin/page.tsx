import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CheckinForm from "./CheckinForm";

export const dynamic = "force-dynamic";

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("preferred_unit").eq("id", user.id).single();
  const { data: lastWeighIn } = await supabase
    .from("weigh_ins")
    .select("weight_kg")
    .eq("client_id", user.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <div>
        <div className="hint">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 className="page-heading">Check-in</h1>
      </div>
      <CheckinForm
        defaultUnit={profile?.preferred_unit ?? "lbs"}
        lastWeightKg={lastWeighIn?.weight_kg ?? null}
        hasError={params.error === "weight"}
      />
    </>
  );
}
