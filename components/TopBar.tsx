"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TopBar({ label }: { label?: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="topbar">
      <span className="brand-mark">VITALS</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {label && <span className="hint">{label}</span>}
        <button className="btn btn-plain" onClick={signOut} style={{ padding: "6px 12px", fontSize: 11 }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
