import type { AuditableDocument, EntityId, ISODateString } from "./common";

export type ConversationType = "direct" | "couple";

/** A 1:1 (or couple-to-couple) messaging thread. */
export interface Conversation extends AuditableDocument {
  type: ConversationType;
  participantUserIds: EntityId[];
  createdById: EntityId;
  lastMessageAt?: ISODateString | null;
}

/** Per-user membership state within a conversation. */
export interface ConversationParticipant {
  conversationId: EntityId;
  userId: EntityId;
  lastReadAt?: ISODateString | null;
}

export type MessageType = "text" | "image" | "video";

export interface MessageMedia {
  id: EntityId;
  kind: "image" | "video";
  storagePath: string;
  caption?: string | null;
}

/** A single message inside a conversation. */
export interface Message extends AuditableDocument {
  conversationId: EntityId;
  senderId: EntityId;
  type: MessageType;
  body?: string | null;
  media?: MessageMedia[] | null;
  readAt?: ISODateString | null;
}