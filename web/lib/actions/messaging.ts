"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/authorization";
import {
  createConversation,
  getConversation,
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  countUnreadMessages,
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
