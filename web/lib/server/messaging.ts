import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/lib/models";
import { buildMessageInsert } from "@/lib/utils/message-payload";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { profileSelectList, mapProfileRow } from "@/lib/server/profiles";
import { getPresenceForUsers } from "@/lib/server/presence";

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

/**
 * Edit a message the current user sent.
 *
 * SECURITY: the ownership check is part of the UPDATE's WHERE clause, not a
 * separate read-then-write step. A read-then-write would be a TOCTOU race and
 * would also mean an attacker could probe another member's messages by watching
 * for a distinguishable "not found" vs "not yours" response. Matching on
 * `sender_id` means a non-owner simply updates zero rows, and — because the
 * service-role client bypasses RLS — that filter is the only thing standing
 * between a member and someone else's messages. It must never be dropped.
 *
 * `content` is the legacy NOT NULL column (see lib/utils/message-payload.ts), so
 * an edit has to be mirrored into it or older readers would keep rendering the
 * pre-edit text.
 */
export async function updateMessage(params: {
  messageId: string;
  senderId: string;
  body: string;
}): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("messages")
    .update({
      body: params.body,
      content: params.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.messageId)
    .eq("sender_id", params.senderId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[messaging] Message update failed", {
      messageId: params.messageId,
      ...supabaseErrorDetail(error),
    });
    throw error;
  }
  return Boolean(data);
}

/**
 * Delete a message the current user sent.
 *
 * Same ownership guarantee as `updateMessage`: `sender_id` is part of the
 * DELETE's WHERE clause so a member can never remove someone else's message.
 * Deletion is a hard delete — messages are not soft-deleted anywhere else in
 * this schema, so a removed message leaves no recoverable row behind.
 */
export async function deleteMessage(params: {
  messageId: string;
  senderId: string;
}): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("messages")
    .delete()
    .eq("id", params.messageId)
    .eq("sender_id", params.senderId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[messaging] Message delete failed", {
      messageId: params.messageId,
      ...supabaseErrorDetail(error),
    });
    throw error;
  }
  return Boolean(data);
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
 * Find the existing 1:1 conversation that contains both users, if any.
 *
 * Used by the First Impressions flow so an introductory message never creates
 * a duplicate thread: the first send opens the conversation, every later send
 * lands in the same one. Returns null when the two users have never talked.
 */
export async function findConversationBetweenUsers(
  userA: string,
  userB: string
): Promise<ConversationRow | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .contains("participant_user_ids", [userA])
    .contains("participant_user_ids", [userB])
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    console.error("[messaging] Conversation lookup between users failed", {
      userA,
      userB,
      ...supabaseErrorDetail(error),
    });
    return null;
  }

  const rows = (data as ConversationRow[] | null) ?? [];
  // Guard against a group/couple thread that merely contains both ids.
  return rows.find((row) => (row.participant_user_ids ?? []).length === 2) ?? rows[0] ?? null;
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
  /**
   * True when the other participant was active inside the presence online
   * window. Resolved from `user_presence` (migration 039) rather than the old
   * `user_sessions.last_seen_at` heuristic, so the inbox dots, the chat header
   * and the profile all agree - they previously used different windows and could
   * show contradictory states for the same person at the same moment.
   */
  isOnline: boolean;
}

/**
 * Best-effort last-message preview + unread counts across all conversations.
 *
 * Online state is NOT derived here. It comes from the shared presence service
 * (`getPresenceForUsers`) so the inbox, the chat header and the profile page all
 * resolve presence through one code path with one online window; three separate
 * heuristics is how they end up disagreeing about the same person.
 */
export async function getInboxSummaries(userId: string): Promise<InboxSummaryRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const conversations = await listConversations(userId);
    if (conversations.length === 0) return [];

    const convIds = conversations.map((c) => c.id);
    const otherIds = conversations
      .flatMap((c) => c.participant_user_ids ?? [])
      .filter((id) => id && id !== userId);

    // One presence query for every participant, issued in parallel with the
    // other reads. Replaces the previous per-conversation `user_sessions`
    // lookup, which used a 5-minute window and the `show_online_status`
    // preference - so a member could show "online" in the inbox while the chat
    // header for the same person said "Offline".
    const [msgResult, unreadResult, profilesResult, presenceMap] = await Promise.all([
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
      getPresenceForUsers(otherIds),
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
      { name: string; kind: "person" | "couple"; avatarUrl: string | null }
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
          // Straight from the shared presence map. No `show_online_status`
          // gate here any more: a member who has the app open is online, and
          // hiding that was what made the dots look broken rather than private.
          isOnline: Boolean(otherId && presenceMap[otherId]?.online),
        };
      })
      .filter((row) => Boolean(row.id));
  } catch (error) {
    console.error("[messaging] inbox summaries failed", supabaseErrorDetail(error as never));
    return [];
  }
}
