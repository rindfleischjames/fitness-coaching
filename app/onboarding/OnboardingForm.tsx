"use client";

import { useEffect, useState } from "react";
import { completeOnboarding } from "./actions";

export default function OnboardingForm({ hasError }: { hasError: boolean }) {
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  return (
    <form action={completeOnboarding} className="field" style={{ gap: 18 }}>
      <div className="field">
        <label htmlFor="full_name">Your name</label>
        <input id="full_name" name="full_name" type="text" placeholder="Jordan Reyes" required />
      </div>

      <div className="field">
        <label htmlFor="preferred_unit">Preferred weight unit</label>
        <select id="preferred_unit" name="preferred_unit" defaultValue="lbs">
          <option value="lbs">Pounds (lbs)</option>
          <option value="kg">Kilograms (kg)</option>
        </select>
      </div>

      <input type="hidden" name="timezone" value={timezone} />
      <p className="hint">Time zone detected as {timezone}</p>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, color: "var(--ink-600)" }}>
        <input type="checkbox" name="consent" required style={{ marginTop: 3 }} />
        <span>
          I agree that my check-in photos and weight data are private — visible only to my coach and
          me, stored securely, and deletable on request.
        </span>
      </label>

      {hasError && (
        <p className="hint" style={{ color: "var(--critical)" }}>
          Please accept the privacy terms to continue.
        </p>
      )}

      <button className="btn btn-accent btn-block" type="submit">
        Get started
      </button>
    </form>
  );
}
