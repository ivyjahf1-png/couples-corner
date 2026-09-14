import type { EntityId, ISODateString } from "./common";

/** Broadcasts (platform-wide push notifications / announcements) */

export type BroadcastAudience = "all" | "active_users";

export type BroadcastType = "announcement" | "alert" | "promotion";

export type BroadcastStatus = "draft" | "sent";

export const BROADCAST_TYPES: BroadcastType[] = ["announcement", "alert", "promotion"];

export const BROADCAST_AUDIENCES: BroadcastAudience[] = ["all", "active_users"];

/** A platform-wide announcement / alert a moderator composes and sends. */
export interface Broadcast {
  id: EntityId;
  title: string;
  body: string;
  audience: BroadcastAudience;
  type: BroadcastType;
  createdBy: EntityId;
  status: BroadcastStatus;
  targetedUserCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  sentAt?: ISODateString | null;
}

/** Support tickets (user inquiries) */

export type SupportTicketCategory =
  | "account"
  | "billing"
  | "bug"
  | "relationship"
  | "safety"
  | "other";

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export const SUPPORT_CATEGORIES: SupportTicketCategory[] = [
  "account",
  "billing",
  "bug",
  "relationship",
  "safety",
  "other",
];

export const SUPPORT_STATUSES: SupportTicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

/** A user-submitted support inquiry with an optional admin reply thread. */
export interface SupportTicket {
  id: EntityId;
  userId: EntityId;
  email: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminUserId?: EntityId | null;
  adminReply?: string | null;
  resolvedAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
