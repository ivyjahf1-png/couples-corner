import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/lib/models";
import { buildMessageInsert } from "@/lib/utils/message-payload";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";

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
