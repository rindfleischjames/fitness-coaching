import OnboardingForm from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div>
          <span className="brand-mark">VITALS</span>
          <h1 className="page-heading" style={{ marginTop: 10 }}>
            Welcome — let&apos;s set you up
          </h1>
          <p className="muted" style={{ marginTop: 4 }}>
            A couple of quick details before your first check-in.
          </p>
        </div>
        <OnboardingForm hasError={params.error === "consent"} />
      </div>
    </div>
  );
}
