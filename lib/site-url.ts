import { headers } from "next/headers";

// Server Actions and Route Handlers have no `window`, so the redirect origin
// has to come from the request itself — never a static env var, which drifts
// the moment this runs somewhere other than wherever that var was set
// (localhost vs. a Vercel preview vs. production all have different hosts).
export async function getServerOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
