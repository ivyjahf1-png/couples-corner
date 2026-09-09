import type { AuditableDocument, EntityId, ISODateString } from "./common";

export type ConnectionRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "canceled";

/** One user requesting a connection with another. */
export interface ConnectionRequest extends AuditableDocument {
  fromUserId: EntityId;
  toUserId: EntityId;
  status: ConnectionRequestStatus;
  note?: string | null;
  respondedAt?: ISODateString | null;
  /** Set when status transitions to "accepted" (refs the Connection). */
  connectionId?: EntityId | null;
}

/** A mutually accepted, two-way connection. */
export interface Connection extends AuditableDocument {
  /** Normalized so user1Id < user2Id for dedup lookups. */
  user1Id: EntityId;
  user2Id: EntityId;
  connectedAt: ISODateString;
  sourceRequestId: EntityId;
}