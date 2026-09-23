import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/lib/models";
import { buildMessageInsert } from "@/lib/utils/message-payload";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { profileSelectList, mapProfileRow } from "@/lib/server/profiles";

/**
 * Couples Corner — server-side messaging service.
 *
 * Fetches conversations and messages from Supabase.
 * All queries run through the Supabase server client (bypasses RLS).
 */

export interface ConversationRow {
  id: string;
  type: Conversation["type"];
  participant_user_ids: string[];
  created_by_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: Message["type"];
  body: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all conversations for the current user. */
export async function listConversations(userId: string): Promise<ConversationRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .contains("participant_user_ids", [userId])
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[messaging] Conversations query failed", {
      userId,
      ...supabaseErrorDetail(error),
    });
    throw error;
  }

  return (data as ConversationRow[] | null) ?? [];
}

/** Fetch a single conversation by ID. */
export async function getConversation(conversationId: string): Promise<ConversationRow | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[messaging] Conversation lookup failed", {
      conversationId,
      ...supabaseErrorDetail(error),
    });
  }

  return (data as ConversationRow | null) ?? null;
}

/**
 * Count unread messages across all of the user's conversations — messages
 * sent by someone else that have no read_at timestamp yet. Used by the
 * mobile bottom bar's Chat badge. Fails soft (returns 0) so the badge can
 * never break navigation.
 */
export async function countUnreadMessages(userId: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return 0;

  try {
    const conversations = await listConversations(userId);
    if (conversations.length === 0) return 0;

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversations.map((c) => c.id))
      .neq("sender_id", userId)
      .is("read_at", null);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Fetch messages for a conversation, ordered oldest first. */
export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[messaging] Messages query failed", {
      conversationId,
      ...supabaseErrorDetail(error),
    });
    throw error;
  }

  return (data as MessageRow[] | null) ?? [];
}

/** Send a message into a conversation. */
export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
  type?: Message["type"];
}): Promise<MessageRow | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("messages")
    .insert(
      buildMessageInsert({
        conversationId: params.conversationId,
        senderId: params.senderId,
        body: params.body,
        type: params.type ?? "text",
        createdAt: now,
        updatedAt: now,
      })
    )
    .select("*")
    .single();

  // Never swallow the database exception — it is the only way to diagnose a
  // failed send (e.g. 23502 NOT NULL on a legacy column, 42501 RLS denial).
  if (error) {
    console.error("[messaging] Message insert failed", {
      conversationId: params.conversationId,
      senderId: params.senderId,
      ...supabaseErrorDetail(error),
    });
    throw error;
  }

  // Update conversation's last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", params.conversationId);

  return (data as MessageRow | null) ?? null;
}

/** Create a new conversation between users. */
export async function createConversation(params: {
  type: Conversation["type"];
  participantUserIds: string[];
  createdById: string;
}): Promise<ConversationRow | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("conversations")
    .insert({
      type: params.type,
      participant_user_ids: params.participantUserIds,
      created_by_id: params.createdById,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  return (data as ConversationRow | null) ?? null;
}

/**
 * Mark every message in a conversation as read for the acting user.
 * Safe to call repeatedly — only messages that are unread and from the
 * other participant get touched.
 */
export async function markConversationRead(params: {
  conversationId: string;
  userId: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const now = new Date().toISOString();

  await supabase
    .from("messages")
    .update({ read_at: now, updated_at: now })
    .eq("conversation_id", params.conversationId)
    .neq("sender_id", params.userId)
    .is("read_at", null)
    .select("id")
    .limit(1);
}

/* ------------------------------------------------------------------ *
 * Inbox summaries — one row per conversation with the other
 * participant's name, last-message preview, timestamp and unread
 * badge. Additive: existing functions are untouched.
 * ------------------------------------------------------------------ */

export interface InboxSummaryRow {
  id: string;
  type: Conversation["type"];
  name: string;
  kind: "person" | "couple";
  avatarUrl: string | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  /** True when the other participant was active in the last 5 minutes
   *  AND opted into showing online status. */
  isOnline: boolean;
}

/** A participant counts as "online" if seen within this window. */
const ONLINE_WINDOW_MS = 5 * 60_000;

/** Best-effort last-message preview + unread counts across all conversations. */
export async function getInboxSummaries(userId: string): Promise<InboxSummaryRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const conversations = await listConversations(userId);
    if (conversations.length === 0) return [];

    const convIds = conversations.map((c) => c.id);

    const [msgResult, unreadResult, profilesResult, sessionsResult] = await Promise.all([
      supabase
        .from("messages")
        .select("conversation_id, sender_id, body, type, read_at, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", userId)
        .is("read_at", null)
        .limit(1000),
      supabase.from("profiles").select(profileSelectList()),
      supabase
        .from("user_sessions")
        .select("user_id, last_seen_at, revoked_at")
        .in(
          "user_id",
          conversations.flatMap((c) => c.participant_user_ids ?? []).filter((id) => id && id !== userId)
        ),
    ]);

    // Fail soft per-query — a messages error still renders names.
    const msgRows = (msgResult.data ?? []) as unknown as Array<{
      conversation_id: string;
      sender_id: string;
      body: string | null;
      type: string;
      read_at: string | null;
      created_at: string;
    }>;
    const unreadRows = (unreadResult.data ?? []) as unknown as Array<{ conversation_id: string }>;
    const profileRows = (profilesResult.data ?? []) as unknown as Array<Record<string, unknown>>;
    const sessionRows = (sessionsResult.data ?? []) as unknown as Array<{
      user_id: string;
      last_seen_at: string | null;
      revoked_at: string | null;
    }>;

    // Most recent session activity per participant (for online dots).
    const lastSeenByUser = new Map<string, number>();
    for (const s of sessionRows) {
      if (!s?.user_id || s.revoked_at || !s.last_seen_at) continue;
      const at = new Date(s.last_seen_at).getTime();
      if (Number.isNaN(at)) continue;
      if (at > (lastSeenByUser.get(s.user_id) ?? 0)) lastSeenByUser.set(s.user_id, at);
    }

    // Last message per conversation (rows are newest-first).
    const lastByConv = new Map<string, (typeof msgRows)[number]>();
    for (const m of msgRows) {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    }
    const unreadByConv = new Map<string, number>();
    for (const u of unreadRows) {
      unreadByConv.set(u.conversation_id, (unreadByConv.get(u.conversation_id) ?? 0) + 1);
    }

    // Participant display names from profiles (id matches user_id).
    const profileById = new Map<
      string,
      { name: string; kind: "person" | "couple"; avatarUrl: string | null; showOnlineStatus: boolean }
    >();
    for (const row of profileRows) {
      const profile = mapProfileRow(row);
      if (!profile?.userId) continue;
      const photos = profile.photos ?? [];
      const primary = photos.find((p) => p?.isPrimary) ?? photos[0] ?? null;
      profileById.set(profile.userId, {
        name: profile.displayName?.trim() || "Member",
        kind: profile.kind,
        avatarUrl:
          primary?.publicUrl ??
          (primary?.storagePath
            ? `/api/photos/${profile.userId}/${primary.storagePath.split("/").pop() ?? ""}`
            : null),
        showOnlineStatus:
          (profile.preferences as Record<string, unknown> | undefined)?.show_online_status === true,
      });
    }

    return conversations
      .map((c) => {
        const otherId =
          c.participant_user_ids?.find((id) => id && id !== userId) ?? null;
        const other = otherId ? profileById.get(otherId) : undefined;
        const last = lastByConv.get(c.id);
        const preview =
          last?.type === "text" && last.body
            ? last.body
            : last
              ? "Sent an attachment"
              : "";
        return {
          id: c.id,
          type: c.type,
          name: other?.name ?? "Chat",
          kind: other?.kind ?? (c.type === "couple" ? "couple" : "person"),
          avatarUrl: other?.avatarUrl ?? null,
          preview,
          lastMessageAt: c.last_message_at ?? last?.created_at ?? null,
          unread: unreadByConv.get(c.id) ?? 0,
          isOnline: Boolean(
            otherId &&
              other?.showOnlineStatus &&
              Date.now() - (lastSeenByUser.get(otherId) ?? 0) <= ONLINE_WINDOW_MS
          ),
        };
      })
      .filter((row) => Boolean(row.id));
  } catch (error) {
    console.error("[messaging] inbox summaries failed", supabaseErrorDetail(error as never));
    return [];
  }
}
