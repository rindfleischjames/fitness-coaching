import { createBrowserClient } from "@supabase/ssr";

// Untyped on purpose: types/database.ts's hand-written interfaces are for
// annotating query results manually, not for wiring into the query builder's
// generic — PostgREST's select-string inference expects the full shape
// `supabase gen types typescript` produces (including per-table
// Relationships metadata) and silently collapses to `never` without it.
// Swap in the generated Database type once a real Supabase project exists.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
