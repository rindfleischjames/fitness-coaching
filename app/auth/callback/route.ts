import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the magic-link code for a session, then hands off to "/" which
// routes by role (and to /onboarding for a first-time client).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
