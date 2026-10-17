import fs from "fs";
const path = "c:/Users/HomePC/Documents/couples-corner/web/lib/server/likes.ts";
let content = fs.readFileSync(path, "utf-8");

const append = `

/** Send a like from viewer to target (creates a profile_like row).
 *  Idempotent: liking the same person twice is a no-op. */
export async function sendLike(likerId: string, likedUserId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  if (likerId === likedUserId) return { ok: false, error: "You can't like yourself" };

  try {
    const { error } = await supabase
      .from("profile_likes")
      .insert({
        liker_id: likerId,
        liked_user_id: likedUserId,
        is_bot: false,
        is_blurred: false,
      });
    if (error) {
      // Duplicate unique (liker_id, liked_user_id) is fine — already liked.
      if (error.code === "23505") return { ok: true };
      console.error("[likes] Send like failed", { likerId, likedUserId, ...supabaseErrorDetail(error) });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error("[likes] Send like exception", { likerId, likedUserId, error });
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't send like" };
  }
}
`;

content += append;
fs.writeFileSync(path, content, "utf-8");
console.log("Appended sendLike to likes.ts");