import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WeightChart from "@/components/WeightChart";
import CompareView from "@/components/CompareView";
import { signOneUrl } from "@/lib/storage";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("preferred_unit").eq("id", user.id).single();
  const { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("client_id", user.id)
    .eq("type", "weight")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: weighIns } = await supabase
    .from("weigh_ins")
    .select("*")
    .eq("client_id", user.id)
    .order("date", { ascending: true });

  const all = weighIns ?? [];
  const chartPoints = all.map((w) => ({ date: w.date, weight_kg: w.weight_kg }));
  const withPhotos = all.filter((w) => w.photo_urls.length > 0).reverse(); // newest first for the gallery

  const thumbUrls = await Promise.all(withPhotos.map((w) => signOneUrl(supabase, w.photo_urls[0])));

  const compareOptions = await Promise.all(
    withPhotos.map(async (w, i) => ({
      date: w.date,
      label: new Date(w.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      url: thumbUrls[i] ?? "",
    }))
  );

  const unit = profile?.preferred_unit ?? "lbs";

  return (
    <>
      <div>
        <div className="hint">Logbook</div>
        <h1 className="page-heading">Progress</h1>
      </div>

      <WeightChart points={chartPoints} unit={unit} goalKg={goal?.target_value ?? null} />

      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Photo history</div>
        {withPhotos.length === 0 ? (
          <p className="empty-state">No progress photos yet — add one from your next check-in.</p>
        ) : (
          <div className="photo-strip">
            {withPhotos.map((w, i) => (
              <div key={w.id} className="thumb">
                {thumbUrls[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrls[i]!} alt="" />
                )}
                <span>{new Date(w.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {compareOptions.filter((c) => c.url).length >= 2 && (
        <CompareView options={compareOptions.filter((c) => c.url) as any} />
      )}

      <Link href="/checkin" className="btn btn-ghost btn-block">
        New check-in
      </Link>
    </>
  );
}
