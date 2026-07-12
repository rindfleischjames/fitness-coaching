import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request and enforces
// coach/client route separation. Runs in middleware.ts.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/invite") ||
    path.startsWith("/auth") ||
    path.startsWith("/manifest") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, consent_accepted_at")
      .eq("id", user.id)
      .single();

    const wantsCoach = path.startsWith("/coach");
    const wantsOnboarding = path.startsWith("/onboarding");

    if (profile?.role === "client" && !profile.consent_accepted_at && !wantsOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    if (profile?.role === "client" && wantsCoach) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (profile?.role === "coach" && !wantsCoach && path !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/coach";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
