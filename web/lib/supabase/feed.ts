/**
 * FEED ENGINE — isolated from the Moment screen.
 *
 * The Feed page (photos + text timeline) owns its own table + bucket:
 *   • table  feed_posts (id, user_id, content, media_urls, created_at)
 *   • bucket feed-uploads
 *
 * Nothing here imports from the Moment/MomentView pipeline
 * (moments table, user-media bucket). That separation is deliberate:
 * feed uploads must keep working even if the Moment screen is refactored.
 */

import { getSupabaseClient } from "@/lib/supabase/client";

export const FEED_BUCKET = "feed-uploads";
export const FEED_TABLE = "feed_posts";

export interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  created_at: string;
}

export interface FeedPostView extends FeedPost {
  authorName: string | null;
  authorAvatarUrl: string | null;
}

/** Upload one feed photo into the dedicated feed-uploads bucket. Returns public URL. */
export async function uploadFeedPhoto(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseClient();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo.jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
  const { error } = await supabase.storage.from(FEED_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(FEED_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Insert a feed_posts row. Feed-only — never touches `moments`. */
export async function createFeedPost(
  userId: string,
  content: string,
  mediaUrls: string[],
): Promise<FeedPost> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(FEED_TABLE)
    .insert({ user_id: userId, content, media_urls: mediaUrls })
    .select("id,user_id,content,media_urls,created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as FeedPost;
}

/** Latest feed timeline rows, newest first. */
export async function getFeedPosts(limit = 20): Promise<FeedPost[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(FEED_TABLE)
    .select("id,user_id,content,media_urls,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedPost[];
}
