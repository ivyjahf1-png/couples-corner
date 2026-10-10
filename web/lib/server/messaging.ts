import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/lib/models";
import { buildMessageInsert } from "@/lib/utils/message-payload";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { profileSelectList, mapProfileRow, profilePhotoUrl } from "@/lib/server/profiles";
import { publicDisplayName } from "@/lib/utils/display-name";
import { getPresenceForUsers } from "@/lib/server/presence";
import type { ProfilePhoto } from "@/lib/models/user";
import { ageFromDateOfBirth, type ConversationParticipantSummary } from "@/lib/feature/types";

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
  /**
   * Pinned to the top of the inbox. Added by migration 050.
   *
   * OPTIONAL (`?`) rather than required on purpose: `listConversations` selects
   * `*` and casts to this type, so a database that has not yet run 050 simply
   * omits the key. A required field here would turn "migration not applied yet"
   * into a wall of type errors across every caller, which is the wrong signal —
   * the right one is "this column does not exist yet".
   */
  is_pinned?: boolean | null;
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
  /**
   * Soft-delete flag (migration 054): true once the sender chose "delete for
   * everyone". The row is KEPT and both participants render a tombstone.
   * Optional so a database that has not run 054 still types: the column is
   * simply absent, nothing is ever flagged, and every row reads as live.
   */
  is_deleted?: boolean | null;
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

/**
 * The other participant of a conversation, for surfaces that only need identity
 * — chiefly the call screen, which shows a name and an avatar and never reads a
 * single message.
 *
 * WHY THIS EXISTS RATHER THAN THE CHAT ACTION. The call route used to resolve its
 * data with `getConversationChatDataAction`, which lives in a `"use server"`
 * module. That is a Server Action, and calling one from a Server Component
 * RENDER is not a supported call site: it goes through the action dispatcher
 * rather than a plain function call, so the call route rendered its error
 * boundary instead of the call screen whenever the dispatcher refused the
 * render-time invocation.
 *
 * This is an ordinary `server-only` function, called directly. It is also the
 * right amount of work for a call: no message history, no icebreaker starter,
 * no read-marking.
 *
 * Returns `null` when the conversation does not exist, is not one the viewer
 * belongs to, or has no other participant. It does not throw, so a bad
 * conversation id cannot take down the call route — the page turns that `null`
 * into a notFound().
 */
export async function getCallPeerSummary(
  conversationId: string,
  viewerId: string
): Promise<ConversationParticipantSummary | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !conversationId || !viewerId) return null;

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, participant_user_ids")
    .eq("id", conversationId)
    .limit(1)
    .maybeSingle();

  if (convError || !conversation) return null;

  // Membership is checked HERE, not just assumed from the URL. The route is
  // reachable by typing any id, so without this a member could open a call
  // screen for a conversation they are not part of.
  const participants = (conversation.participant_user_ids as string[]) ?? [];
  if (!participants.includes(viewerId)) return null;

  const others = participants.filter((id) => id !== viewerId);
  if (others.length === 0) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(profileSelectList())
    .in("user_id", others)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    console.error("[messaging] call peer profile lookup failed", {
      conversationId,
      ...supabaseErrorDetail(profileError),
    });
    // A peer whose profile failed to read is not a reason to deny the call.
    // `CallScreen` renders a name-only fallback for a null summary.
    return null;
  }
  if (!profile) return null;

  /* The generated client types `.maybeSingle()` as a union that includes a
     `GenericStringError` string branch, so the row is not statically a
     `Record<string, unknown>` even though every non-error branch is an object.
     Narrowing on `typeof profile === "object"` removes the string case and is
     the honest guard: anything that is not an object cannot carry a profile. */
  if (typeof profile !== "object" || profile === null) return null;

  return mapCallPeer(profile as unknown as Record<string, unknown>, others[0]);
}

/** Project a `profiles` row down to the fields the call screen needs. */
function mapCallPeer(
  row: Record<string, unknown>,
  peerId: string
): ConversationParticipantSummary {
  const photos = (row.photos as ProfilePhoto[] | null) ?? [];
  return {
    id: peerId,
    /* Address-shaped names are reduced to their prefix — this lands in the chat
       header and on every incoming bubble as the participant name. */
    name: publicDisplayName(row.display_name as string | null) || "Member",
    kind: ((row.profile_type as string | null) === "coupled" ? "couple" : "person") as
      | "person"
      | "couple",
    // `profilePhotoUrl`, not an inline `publicUrl` lookup — see the note in
    // `getConversationChatDataAction`. The `photos` rows carry a `storagePath`
    // and no `publicUrl`, so the inline version always returned null and the call
    // screen showed initials for members who had a photo.
    avatarUrl: profilePhotoUrl({ userId: peerId, photos }),
    verified: false,
    location: (row.location as string | null) ?? null,
    age: ageFromDateOfBirth((row.date_of_birth as string | null) ?? undefined),
    relationshipStatus: (row.relationship_status as string | null) ?? null,
    lifestyleTags: ((row.interests as string[] | null) ?? []).slice(0, 4),
    photos,
  };
}

/** Fetch messages for a conversation, ordered oldest first. */
export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  /* Exactly `MessageRow`'s columns, not "*": this query pulls up to 500 rows
     per thread open, and the legacy `content` text kept only for the write
     bridge is never read back by any typed consumer. Mirrors migration 016's
     shape.

     `is_deleted` (migration 054) is selected but NOT filtered out: a row the
     sender deleted-for-everyone stays in the list so BOTH participants render
     the "This message was deleted" tombstone instead of a silent gap. */
  const COLUMNS_WITH_FLAG =
    "id, conversation_id, sender_id, type, body, read_at, created_at, updated_at, is_deleted";
  const COLUMNS_BASE =
    "id, conversation_id, sender_id, type, body, read_at, created_at, updated_at";

  let { data, error } = await supabase
    .from("messages")
    .select(COLUMNS_WITH_FLAG)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);

  /* Fallback: a database that has not run migration 054 rejects the unknown
     column and fails the ENTIRE query — the thread would not open at all.
     Degrading to the pre-054 column list keeps the chat working; every row
     simply reads as live (no tombstones) until the migration is applied.

     The cast is sound: `is_deleted` is OPTIONAL on `MessageRow`, so rows
     selected without it satisfy the type — they simply never carry the flag. */
  if (error && isMissingColumnError(error)) {
    const retry = await supabase
      .from("messages")
      .select(COLUMNS_BASE)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    console.error("[messaging] Messages query failed", {
      conversationId,
      ...supabaseErrorDetail(error),
    });
    throw error;
  }

  return (data as MessageRow[] | null) ?? [];
}

/** True when a Supabase/Postgres error is an unknown-column (42703). */
function isMissingColumnError(error: unknown): boolean {
  const detail = supabaseErrorDetail(error as never);
  const text = `${detail.code ?? ""} ${detail.message ?? ""}`.toLowerCase();
  return detail.code === "42703" || text.includes("does not exist");
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
    /* Row shape matches `MessageRow` — the same eight columns `listMessages`
       selects, so both read paths agree on what a message row IS. */
    .select("id, conversation_id, sender_id, type, body, read_at, created_at, updated_at")
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
 * THE 15-MINUTE EDIT WINDOW is enforced HERE, in the same WHERE clause
 * (`.gte("created_at", cutoff)`), not only in the UI: a client-side check is
 * a courtesy, this one is the rule. When zero rows match, one cheap read
 * classifies why — missing/not-yours vs simply too old — so the member gets
 * the real reason instead of a generic failure.
 *
 * `content` is the legacy NOT NULL column (see lib/utils/message-payload.ts), so
 * an edit has to be mirrored into it or older readers would keep rendering the
 * pre-edit text.
 */
export async function updateMessage(params: {
  messageId: string;
  senderId: string;
  body: string;
  /** How long after sending an edit is allowed. Defaults to 15 minutes. */
  editWindowMs?: number;
}): Promise<{ ok: boolean; reason?: "not_found" | "too_old" }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "not_found" };

  const cutoff = new Date(
    Date.now() - (params.editWindowMs ?? EDIT_WINDOW_MS)
  ).toISOString();

  const { data, error } = await supabase
    .from("messages")
    .update({
      body: params.body,
      content: params.body,
      updated_at: new Date().toISOString(),
      // The ONLY writer of `edited_at`. This is what the chat thread reads to
      // decide whether to show the "edited" tag, so it has to be set here and
      // nowhere else. See migration 044 for why the tag cannot be inferred
      // from `updated_at` any more.
      edited_at: new Date().toISOString(),
    })
    .eq("id", params.messageId)
    .eq("sender_id", params.senderId)
    .gte("created_at", cutoff)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[messaging] Message update failed", {
      messageId: params.messageId,
      ...supabaseErrorDetail(error),
    });
    throw error;
  }

  if (data) return { ok: true };

  // Zero rows: not ours / missing, or outside the edit window. One read on
  // this failure path only tells them apart.
  const { data: existing } = await supabase
    .from("messages")
    .select("created_at")
    .eq("id", params.messageId)
    .eq("sender_id", params.senderId)
    .maybeSingle();

  if (!existing) return { ok: false, reason: "not_found" };
  return { ok: false, reason: "too_old" };
}

/** How long a sent message may be edited. Mirrored by the chat UI. */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * "Delete for everyone" — soft delete (migration 054).
 *
 * Same ownership guarantee as `updateMessage`: `sender_id` is part of the
 * UPDATE's WHERE clause so a member can never remove someone else's message.
 *
 * The row is FLAGGED (`is_deleted = true`), not removed. Both participants
 * then render a "This message was deleted" tombstone, which is the industry
 * standard and — unlike a hard delete — leaves no silent gap in the thread
 * the other member cannot explain.
 */
export async function deleteMessage(params: {
  messageId: string;
  senderId: string;
}): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("messages")
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
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
 *
 * WHY THIS USED TO ALSO WRITE `updated_at` — AND WHY IT MUST NOT:
 *
 * Read state has its own column, `read_at`. `updated_at` means "the CONTENT of
 * this message changed", and the chat thread decides whether to show the
 * "edited" tag by comparing `updated_at` against `created_at`.
 *
 * Stamping `updated_at` here made simply OPENING a conversation rewrite the
 * edit timestamp on every unread message in it. The conversation page calls
 * this on load, so a member who opened a chat once saw "edited" under every
 * message in it — including messages they had never touched. Worse, the damage
 * was persistent: once stamped, the row looks genuinely edited forever, so the
 * tag could not be undone by fixing the UI.
 *
 * Marking as read is a delivery concern, not an authorship one. It now touches
 * `read_at` and nothing else, which is both correct and cheaper: the write no
 * longer dirties rows the sender owns.
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
    .update({ read_at: now })
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
  /**
   * THE OTHER PARTICIPANT'S USER ID — not the conversation's.
   *
   * Added so the inbox avatar/name can open the global profile view modal
   * (`openProfileView`) instead of only navigating to the thread. Null when the
   * conversation has no other participant (a self-thread or an un-migrated row);
   * the card then simply does not offer the profile view.
   */
  userId: string | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  /**
   * Pinned to the top of the inbox (migration 050).
   *
   * `Boolean()` rather than a bare pass-through: the column is optional on
   * `ConversationRow` precisely so an un-migrated database yields `undefined`,
   * and that has to collapse to a plain `false` here. An `undefined` reaching the
   * `chat.isPinned ? ... : ...` branch renders as falsy anyway, but a filter
   * written `chats.filter(c => c.isPinned)` would silently return an empty
   * pinned section instead of showing the honest "nothing pinned" empty state.
   */
  isPinned: boolean;
  /**
   * True when the other participant was active inside the presence online
   * window. Resolved from `user_presence` (migration 039) rather than the old
   * `user_sessions.last_seen_at` heuristic, so the inbox dots, the chat header
   * and the profile all agree - they previously used different windows and could
   * show contradictory states for the same person at the same moment.
   */
  isOnline: boolean;
  /**
   * Age derived from the other participant's `date_of_birth`, or null when they
   * have not set one (or the value is corrupt — see `ageFromDateOfBirth`).
   *
   * The inbox card renders "Sarah Chen, 32", the shape every dating surface in
   * the product uses. Computed here rather than in the client component so the
   * date of birth itself never crosses the boundary — only the integer does.
   */
  age: number | null;
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
      { name: string; kind: "person" | "couple"; avatarUrl: string | null; age: number | null }
    >();
    for (const row of profileRows) {
      const profile = mapProfileRow(row);
      if (!profile?.userId) continue;
      const photos = profile.photos ?? [];
      const primary = photos.find((p) => p?.isPrimary) ?? photos[0] ?? null;
      profileById.set(profile.userId, {
        /* `publicDisplayName` first: signup seeds display_name from the address,
           so a raw value can be "ivyjahf1@gmail.com" — and this string is printed
           in the INBOX next to every preview. Only the prefix is public; the full
           address is rendered exclusively by /settings. */
        name: publicDisplayName(profile.displayName) || "Member",
        kind: profile.kind,
        /* Null for anyone who has not set a DOB or whose value is unparseable —
           the card then renders the name alone rather than a placeholder age. */
        age: ageFromDateOfBirth(profile.dateOfBirth),
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
          /* The other participant's uid, resolved above for the presence lookup
             too — one source for "who is this row about", used by the global
             profile view modal on the avatar. Null for a self-thread. */
          userId: otherId,
          preview,
          lastMessageAt: c.last_message_at ?? last?.created_at ?? null,
          unread: unreadByConv.get(c.id) ?? 0,
          age: other?.age ?? null,
          // Straight from the shared presence map. No `show_online_status`
          // gate here any more: a member who has the app open is online, and
          // hiding that was what made the dots look broken rather than private.
          isOnline: Boolean(otherId && presenceMap[otherId]?.online),
          /* Migration 050. `Boolean` collapses the "column not applied yet"
             undefined to false, so an un-migrated database shows an honest empty
             pinned section instead of a filter that silently returns nothing. */
          isPinned: Boolean(c.is_pinned),
        };
      })
      .filter((row) => Boolean(row.id));
  } catch (error) {
    console.error("[messaging] inbox summaries failed", supabaseErrorDetail(error as never));
    return [];
  }
}
