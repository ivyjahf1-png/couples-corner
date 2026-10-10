"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/authorization";
import {
  createConversation,
  findConversationBetweenUsers,
  getConversation,
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  countUnreadMessages,
  updateMessage,
  deleteMessage,
  type MessageRow,
} from "@/lib/server/messaging";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { profileSelectList, mapProfileRow, profilePhotoUrl } from "@/lib/server/profiles";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import { publicDisplayName } from "@/lib/utils/display-name";
import type { ConversationParticipantSummary, ChatStarter } from "@/lib/feature/types";
import { ageFromDateOfBirth } from "@/lib/feature/types";

/** Shape returned by every messaging action so clients can show inline errors. */
export interface ActionResult {
  ok: boolean;
  error?: string;
  /**
   * The persisted row, on a successful send.
   *
   * Returning it is what makes the sender's own bubble appear with the SAME id
   * the database assigned: the client renders this row immediately instead of
   * waiting for the realtime INSERT to round-trip back, and the dedupe-by-id
   * merge collapses the two into one the moment the broadcast lands. Without
   * it the member stares at a sent-but-invisible message for 100-300ms — the
   * classic "my message didn't send" double-tap.
   */
  message?: MessageRow;
}

/** Fetch all conversations for the current user. */
export async function getConversationsAction() {
  const user = await requireUser();
  return listConversations(user.uid);
}

/** Fetch a single conversation. */
export async function getConversationAction(conversationId: string) {
  await requireUser();
  return getConversation(conversationId);
}

/** Fetch messages for a conversation. */
export async function getMessagesAction(conversationId: string) {
  await requireUser();
  return listMessages(conversationId);
}

/** Send a message into a conversation. */
export async function sendMessageAction(params: {
  conversationId: string;
  body: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const message = await sendMessage({
      conversationId: params.conversationId,
      senderId: user.uid,
      body: params.body,
      type: "text",
    });
    /* The INBOX is revalidated, the thread is NOT — and that split is what makes
       sends feel instant.

       The thread client already holds this row (returned below) plus its realtime
       subscription, so re-rendering the route the member is looking at bought
       nothing but a server round trip on every single send: the composer blocked
       on `busy` until the RSC stream came back. `/messages` is the surface that
       genuinely goes stale — its preview and unread badge now show the wrong
       thing — so that is the one path invalidated. Same reasoning as
       `markConversationReadAction` above. */
    revalidatePath("/messages");
    return { ok: true, message: message ?? undefined };
  } catch (error) {
    rethrowIfNavigation(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Couldn't send your message",
    };
  }
}

/** Maximum length of a First Impression body (matches the discovery overlay).
 *  Module-private: "use server" files may only export async functions. */
const IMPRESSION_MAX_LENGTH = 500;

/** Outcome of a First Impressions send, including the thread it landed in. */
export interface FirstImpressionResult extends ActionResult {
  /** Conversation id the message was written to — used to deep-link the inbox. */
  conversationId?: string;
  /** True when this send opened a brand-new conversation. */
  created?: boolean;
}

/**
 * Send a First Impression — the introductory message composed from a discovery
 * card or a public profile.
 *
 * The message is stored as an ordinary `text` message inside a real `direct`
 * conversation, so it shows up in the Messages inbox for both people straight
 * away. The conversation is created on the first send and reused on every
 * later send, which keeps the inbox free of duplicate threads for one pair.
 *
 * Sending to yourself is rejected — a user can never open a chat with
 * themselves (same guard as the profile/discovery surfaces).
 */
export async function sendFirstImpressionAction(params: {
  recipientId: string;
  body: string;
}): Promise<FirstImpressionResult> {
  const user = await requireUser();
  const recipientId = (params.recipientId ?? "").trim();
  const body = (params.body ?? "").trim().slice(0, IMPRESSION_MAX_LENGTH);

  if (!recipientId) {
    return { ok: false, error: "That profile can't receive messages right now." };
  }
  if (recipientId === user.uid) {
    return { ok: false, error: "You can't send an impression to yourself." };
  }
  if (!body) {
    return { ok: false, error: "Write a short introduction before sending." };
  }

  try {
    let conversation = await findConversationBetweenUsers(user.uid, recipientId);
    let created = false;

    if (!conversation) {
      conversation = await createConversation({
        type: "direct",
        participantUserIds: [user.uid, recipientId],
        createdById: user.uid,
      });
      created = true;
    }

    if (!conversation?.id) {
      return { ok: false, error: "Couldn't open a conversation. Please try again." };
    }

    await sendMessage({
      conversationId: conversation.id,
      senderId: user.uid,
      body,
      type: "text",
    });

    // The inbox list and the thread itself both change on a send.
    revalidatePath("/messages");
    revalidatePath(`/messages/${conversation.id}`);

    return { ok: true, conversationId: conversation.id, created };
  } catch (error) {
    rethrowIfNavigation(error);
    console.error("[messaging] First Impression send failed", {
      recipientId,
      ...supabaseErrorDetail(error as never),
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Couldn't send your impression",
    };
  }
}

/** Maximum length of an edited message body. */
const EDIT_MAX_LENGTH = 4000;

/**
 * Edit a message the current user sent.
 *
 * Ownership is enforced in the database layer (`updateMessage` filters on
 * `sender_id`), so this action never has to trust the client about who sent the
 * message. An empty body is rejected rather than blanking the bubble, because a
 * hard delete already exists and is the honest way to remove a message.
 */
export async function editMessageAction(params: {
  messageId: string;
  body: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const messageId = (params.messageId ?? "").trim();
  const body = (params.body ?? "").trim().slice(0, EDIT_MAX_LENGTH);

  if (!messageId) return { ok: false, error: "That message could not be found." };
  if (!body) return { ok: false, error: "A message cannot be empty. Delete it instead." };

  try {
    const result = await updateMessage({
      messageId,
      senderId: user.uid,
      body,
    });
    if (result.ok) {
      revalidatePath("/messages");
      return { ok: true };
    }
    // The 15-minute edit window is enforced server-side (same WHERE clause as
    // the ownership check), so a stale UI that still offers Edit fails here
    // with the real reason rather than silently doing nothing.
    if (result.reason === "too_old") {
      return { ok: false, error: "Messages can only be edited within 15 minutes of sending." };
    }
    return { ok: false, error: "You can only edit messages you sent." };
  } catch (error) {
    rethrowIfNavigation(error);
    console.error("[messaging] Edit failed", {
      messageId,
      ...supabaseErrorDetail(error as never),
    });
    return { ok: false, error: "Couldn't save your edit. Please try again." };
  }
}

/**
 * "Delete for everyone" — soft delete via the database layer (migration 054
 * flags `is_deleted = true`; the row is kept and both participants render a
 * tombstone). Ownership is enforced in the database layer, exactly as for
 * `editMessageAction`.
 */
export async function deleteMessageAction(params: {
  messageId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const messageId = (params.messageId ?? "").trim();
  if (!messageId) return { ok: false, error: "That message could not be found." };

  try {
    const removed = await deleteMessage({ messageId, senderId: user.uid });
    if (!removed) {
      return { ok: false, error: "You can only delete messages you sent." };
    }
    revalidatePath("/messages");
    return { ok: true };
  } catch (error) {
    rethrowIfNavigation(error);
    console.error("[messaging] Delete failed", {
      messageId,
      ...supabaseErrorDetail(error as never),
    });
    return { ok: false, error: "Couldn't delete that message. Please try again." };
  }
}

/**
 * Mark a conversation as read for the current user.
 *
 * ── WHY THIS MUST NOT RUN DURING RENDER ─────────────────────────────────────
 * This used to be called straight from the conversation page's render, via
 * `void markConversationReadAction(conversationId)`. That is invalid in two
 * separate ways, and both produced a runtime crash on opening any chat:
 *
 *   1. `revalidatePath` is only legal inside a Server Action or Route Handler
 *      invoked as a MUTATION. Next.js throws
 *      "Route /messages/... used `revalidatePath` ... during render which is
 *      unsupported" when it runs from a render pass. The page is a Server
 *      Component, so calling this during its render put `revalidatePath`
 *      squarely in a render context.
 *   2. A render must be side-effect free. Marking rows read mutates the
 *      database, and React may render a component more than once (Strict Mode
 *      deliberately does), so a write in render is a write that can happen
 *      without the member doing anything.
 *
 * The write itself correctly belongs here — this IS a mutation, and it is
 * correctly revalidating the inbox so the unread badge clears. The fix was on
 * the CALLER: `ConversationClient` now invokes this from a mount effect, which
 * is a real mutation context. See
 * `app/(app)/messages/[conversationId]/ConversationClient.tsx`.
 *
 * ── WHY ONLY `/messages` IS REVALIDATED ─────────────────────────────────────
 * The thread path is deliberately NOT revalidated. The member is looking at it,
 * and its server render already carries the correct, freshly-read data.
 * Revalidating the route currently being viewed re-renders the page underneath
 * the client that just asked for the write, for no visible gain. The inbox is
 * the one surface whose cached copy is now stale.
 */
export async function markConversationReadAction(conversationId: string) {
  const user = await requireUser();
  await markConversationRead({ conversationId, userId: user.uid });
  revalidatePath("/messages");
}

/** Count unread messages across all of the current user's conversations. */
export async function getUnreadCountAction() {
  const user = await requireUser();
  return countUnreadMessages(user.uid);
}

/** Fetch a conversation plus its other participant (for the summary card). */
export async function getConversationWithParticipantAction(
  conversationId: string
) {
  const user = await requireUser();
  const conversation = await getConversation(conversationId);
  if (!conversation) return null;

  const others = conversation.participant_user_ids.filter(
    (id) => id !== user.uid
  );
  if (others.length === 0) {
    return { conversation, otherProfile: null };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { conversation, otherProfile: null };
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(profileSelectList())
    .in("user_id", others)
    .limit(1);

  if (error) {
    console.error("[messaging] participant profile lookup failed", {
      conversationId,
      ...supabaseErrorDetail(error),
    });
    return { conversation, otherProfile: null };
  }

  const row = (profiles as unknown as Record<string, unknown>[] | null)?.[0];
  const otherProfile = row ? mapProfileRow(row) : null;

  return { conversation, otherProfile };
}

/** Build a deterministic chat starter for a newly opened conversation. */
function pickStarter(userId: string): ChatStarter {
  const starters: ChatStarter[] = [
    {
      id: "starter-1",
      body:
        "HI HELLO 🥰😁😊 NICE TO MEET YOU! I'm so excited to chat and get to know each other better 💕",
    },
    {
      id: "starter-2",
      body:
        "Hey there! I saw we both match on a few things — what's something you're really passionate about right now?",
    },
    {
      id: "starter-3",
      body:
        "Hi! I'd love to hear more about your world. What's been the highlight of your week so far? ☀️",
    },
  ];

  const index = userId.charCodeAt(0) % starters.length;
  return starters[index];
}

/** Fetch a conversation plus its other participant and a chat starter. */
export async function getConversationChatDataAction(
  conversationId: string
) {
  const user = await requireUser();
  const result = await getConversationWithParticipantAction(conversationId);
  if (!result) return null;

  const { conversation, otherProfile } = result;

  // A thread without another participant is not a conversation — this blocks a
  // user from ever opening (or being routed into) a chat with themselves.
  const others = (conversation.participant_user_ids ?? []).filter((id) => id !== user.uid);
  if (others.length === 0) return null;

  const initialMessages = await listMessages(conversationId);

  const summary: ConversationParticipantSummary | null =
    otherProfile
      ? {
          id: otherProfile.userId,
          /* Prefix only — this name is the chat header and the label on every
             incoming bubble, both public. Full addresses stay in /settings. */
          name: publicDisplayName(otherProfile.displayName) || "Member",
          kind: otherProfile.kind,
          // `profilePhotoUrl`, NOT an inline `photos.find(isPrimary)?.publicUrl`.
          //
          // The inline version this replaces was the bug: `photos` rows are
          // persisted with a `storagePath` and NO `publicUrl` (see
          // `setPrimaryProfilePhoto` in lib/server/profiles.ts), so that lookup
          // always resolved to `undefined ?? null` and every chat header and
          // incoming bubble fell back to initials — for members who HAD uploaded
          // a photo. Discovery has always used `profilePhotoUrl` and always
          // showed faces, which is why the same profile looked right in Discover
          // and blank in the chat.
          //
          // `profilePhotoUrl` is the one canonical resolver: primary-first, then
          // first photo, then `publicUrl` OR the `/api/photos/{uid}/{file}`
          // route derived from `storagePath`. Using it here is what stops the two
          // surfaces drifting again.
          avatarUrl: profilePhotoUrl(otherProfile),
          // `verified` is FALSE because nothing has verified anyone.
          //
          // This was a literal `true`, and `ConversationSummaryCard` rendered it
          // as a "Real Person" badge — so every member was told every stranger
          // had been verified, on the strength of a hardcoded constant. In a
          // dating app that is the most damaging single lie the product could
          // tell: it is the badge a member would rely on when deciding whether
          // to meet someone in person.
          //
          // `mapProfileRow` already exposes a real verification value if the
          // profile schema ever grows one; until then absence of data must read
          // as "unknown", never as "verified".
          verified: false,
          location: otherProfile.location ?? null,
          // Derived from the stored `date_of_birth`, never stored as its own
          // column. Null when they have not shared a date of birth, and the
          // card omits the chip rather than showing a fabricated number.
          age: ageFromDateOfBirth(otherProfile.dateOfBirth),
          // Their own words, passed through untouched. The card does not
          // interpret or reword it.
          relationshipStatus: otherProfile.relationshipStatus ?? null,
          lifestyleTags: otherProfile.interests?.slice(0, 4) ?? [],
          photos: otherProfile.photos ?? [],
  // The summary carries only what was actually read. `personalitySimilarity`
  // is deliberately ABSENT: there is no compatibility engine in the product, and
  // the field used to be hardcoded to 78 here — which `ConversationSummaryCard`
  // then rendered as "78% match". A fabricated score in a dating app is worse
  // than no score: it invites a member to make a decision about a real person on
  // a number the product invented. It stays out until something genuinely
  // computes it.
        }
      : null;

  const starter = pickStarter(user.uid);

  return {
    conversation,
    summary,
    starter,
    initialMessages,
  };
}
