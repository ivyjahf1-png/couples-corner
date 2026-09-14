/**
 * Couples Corner — safety & anti-abuse domain types.
 */

import type { EntityId, ISODateString } from "./common";

/** Who/what a report targets. */
export type ReportEntityType = "user" | "couple" | "post" | "comment" | "message";

/** User-facing report categories. */
export const REPORT_REASONS = [
  "Scam or fraud",
  "Asking for money",
  "Investment or crypto request",
  "Gift card request",
  "Emergency-money story",
  "Fake or impersonation profile",
  "Suspicious links or phishing",
  "Harassment or bullying",
  "Spam or repetitive content",
  "Inappropriate content",
  "Something else",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Admin-side priority tiers for triaging reports. */
export type RiskPriority = "low" | "medium" | "high" | "urgent";

export type ReportStatus = "open" | "reviewed" | "resolved" | "dismissed";

/** A user-submitted report. */
export interface Report {
  id: EntityId;
  reporterId: EntityId;
  entityType: ReportEntityType;
  entityId: EntityId;
  reason: ReportReason;
  details?: string | null;
  priority: RiskPriority;
  status: ReportStatus;
  handledByAdminId?: EntityId | null;
  resolutionNote?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Risk signals emitted by content scanning. */
export type RiskSignalType =
  | "suspicious_message"
  | "mass_messaging"
  | "excessive_connection_requests"
  | "repeated_reports"
  | "suspicious_link"
  | "profile_impersonation"
  | "rapid_profile_change";

export interface RiskFlag {
  id: EntityId;
  targetUserId: EntityId;
  type: RiskSignalType;
  context: string;
  source: "client_message_send" | "admin" | "cloud_function";
  score: number;
  createdAt: ISODateString;
}

/** Blocking. */
export interface Block {
  id: EntityId;
  blockerId: EntityId;
  blockedId: EntityId;
  reason?: string | null;
  createdAt: ISODateString;
}

/** Server-side audit entry for admin report actions. */
export interface ModerationAction {
  id: EntityId;
  adminUserId: EntityId;
  entityType: ReportEntityType;
  entityId: EntityId;
  action: "review" | "dismiss" | "warn" | "restrict" | "suspend" | "ban" | "remove-content";
  note?: string | null;
  createdAt: ISODateString;
}
