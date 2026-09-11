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
} from "@/lib/server/messaging";

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
}) {
  const user = await requireUser();
  const message = await sendMessage({
    conversationId: params.conversationId,
    senderId: user.uid,
    body: params.body,
    type: "text",
  });
  revalidatePath(`/messages/${params.conversationId}`);
  return message;
}

/** Create a new conversation. */
export async function createConversationAction(params: {
  type: "direct" | "couple";
  participantUserIds: string[];
}) {
  const user = await requireUser();
  const conversation = await createConversation({
    type: params.type,
    participantUserIds: params.participantUserIds,
    createdById: user.uid,
  });
  revalidatePath("/messages");
  return conversation;
}
