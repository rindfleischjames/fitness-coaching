import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL = 60 * 30; // 30 minutes — plenty for a page render + a bit of browsing

export type Bucket = "check-in-photos" | "message-attachments";

export async function signPhotoUrls(supabase: SupabaseClient, paths: string[], bucket: Bucket = "check-in-photos"): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL);
  if (error || !data) return [];
  return data.map((d) => d.signedUrl ?? "");
}

export async function signOneUrl(supabase: SupabaseClient, path: string, bucket: Bucket = "check-in-photos"): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}
