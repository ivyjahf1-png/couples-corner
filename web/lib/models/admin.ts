import type { EntityId, ISODateString } from "./common";

/**
 * Couples Corner — admin / moderation / broadcast / support domain types.
 *
 * These map onto Supabase tables (`broadcasts`, `support_tickets`) and reuse
 * the existing `reports`, `risk_flags`, `users` tables where applicable.
 */

/* ------------------------------------------------------------------ *
 *  Broadcasts (platform-wide push notifications / announcements)
 * ------------------------------------------------------------------ */

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
  /** Admin uid that authored this broadcast. */
  createdBy: EntityId;
  status: BroadcastStatus;
  /** How many users were targeted when sent (0 = not sent). */
  targetedUserCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** ISO timestamp of the in-app notification fan-out, if sent. */
  sentAt?: ISODateString | null;
}

/* ------------------------------------------------------------------ *
 *  Support tickets (user inquiries)
 * ------------------------------------------------------------------ */

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
  /** Admin uid that last acted / replied, if any. */
  adminUserId?: EntityId | null;
  adminReply?: string | null;
  /** ISO timestamp when an admin marked it resolved. */
  resolvedAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}