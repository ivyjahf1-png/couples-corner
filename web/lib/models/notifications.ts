import type { AuditableDocument, EntityId, ISODateString } from "./common";

export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "connection_declined"
  | "match"
  | "message"
  | "like"
  | "comment"
  | "system";

/** A single notification delivered to one user. */
export interface Notification extends AuditableDocument {
  recipientId: EntityId;
  type: NotificationType;
  /** The user whose action triggered the notification (null for system). */
  actorId?: EntityId | null;
  /** Reference to the entity involved (e.g. "post", "conversation"). */
  entityType?: string | null;
  entityId?: EntityId | null;
  title: string;
  body?: string | null;
  readAt?: ISODateString | null;
}