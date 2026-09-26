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
} from "@/lib/server/messaging";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { profileSelectList, mapProfileRow } from "@/lib/server/profiles";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import type { ConversationParticipantSummary, ChatStarter } from "@/lib/feature/types";

/** Shape returned by every messaging action so clients can show inline errors. */
export interface ActionResult {
  ok: boolean;
  error?: string;
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
    revalidatePath(`/messages/${params.conversationId}`);
    return { ok: true };
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
    const updated = await updateMessage({ messageId, senderId: user.uid, body });
    if (!updated) {
      return { ok: false, error: "You can only edit messages you sent." };
    }
    revalidatePath("/messages");
    return { ok: true };
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
 * Delete a message the current user sent. Ownership is enforced in the
 * database layer, exactly as for `editMessageAction`.
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

/** Mark a conversation as read for the current user. */
export async function markConversationReadAction(conversationId: string) {
  const user = await requireUser();
  await markConversationRead({ conversationId, userId: user.uid });
  revalidatePath(`/messages/${conversationId}`);
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

  let initialMessages = await listMessages(conversationId);

  const summary: ConversationParticipantSummary | null =
    otherProfile
      ? {
          id: otherProfile.userId,
          name: otherProfile.displayName,
          kind: otherProfile.kind,
          avatarUrl: otherProfile.photos?.find((p) => p.isPrimary)?.publicUrl ??
            otherProfile.photos?.[0]?.publicUrl ??
            null,
          verified: true,
          location: otherProfile.location ?? null,
          lifestyleTags: otherProfile.interests?.slice(0, 4) ?? [],
          photos: otherProfile.photos ?? [],
          personalitySimilarity: 78,
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
