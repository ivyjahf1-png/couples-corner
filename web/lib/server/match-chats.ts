import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface MatchChatView {
  id: string;
  name: string;
  kind: "person" | "couple";
  lastMessageAt: string | null;
}

/** Only list conversations containing the authenticated viewer, newest activity first. */
export async function getMatchChats(uid: string): Promise<MatchChatView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error(
      "[match-chats] Supabase server client is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)"
    );
    throw new Error("Supabase not configured");
  }

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, type, participant_user_ids, last_message_at")
    .contains("participant_user_ids", [uid])
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    // Robust server-side logging: full PostgREST error (code, message,
    // details, hint) plus the request scope, so the exact database
    // exception is inspectable in the server/Netlify function logs.
    console.error("[match-chats] Conversations query failed", {
      uid,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
  if (!conversations?.length) return [];

  const participantIds = [...new Set(conversations.flatMap(
    (conversation) => (conversation.participant_user_ids as string[]).filter((id) => id !== uid)
  ))];
  const names = new Map<string, string>();

  if (participantIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", participantIds);
    if (profileError) {
      console.error("[match-chats] Profiles lookup failed", {
        uid,
        participantCount: participantIds.length,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
      throw profileError;
    }
    for (const profile of profiles ?? []) {
      names.set(profile.user_id, profile.display_name?.trim() || "Member");
    }
  }

  return conversations.map((conversation) => ({
    id: conversation.id,
    name: (conversation.participant_user_ids as string[])
      .filter((id) => id !== uid)
      .map((id) => names.get(id) ?? "Former member")
      .join(" & ") || "Conversation",
    kind: conversation.type === "couple" ? "couple" : "person",
    lastMessageAt: conversation.last_message_at,
  }));
}
