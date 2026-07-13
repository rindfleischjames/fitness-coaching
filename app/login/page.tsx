"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div>
          <span className="brand-mark">VITALS</span>
          <p className="muted" style={{ marginTop: 6 }}>
            Sign in with your email — no password needed.
          </p>
        </div>

        {status === "sent" ? (
          <div className="card card-solid">
            <p className="card-title" style={{ marginBottom: 4 }}>Check your inbox</p>
            <p className="card-meta">
              We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="field" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {status === "error" && (
              <p className="hint" style={{ color: "var(--critical)" }}>{errorMessage}</p>
            )}
            <button className="btn btn-accent btn-block" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
