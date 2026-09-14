import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export const PROFILE_PHOTOS_BUCKET = "profile-photos";

export async function ensureStorageBucket(supabase: ReturnType<typeof getSupabaseServerClient>, bucket: string): Promise<void> {
  // no-op in this extracted app — bucket management happens in the main app
}
