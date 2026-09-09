/**
 * Couples Corner — safety & anti-abuse domain types.
 *
 * Extends the base `Report` model with structured categories, risk priority,
 * and message-content scan signals. These never auto-ban: signals are written
 * to a `riskFlags` collection read only by moderators / a future Cloud
 * Function, so normal users cannot manipulate their own risk score.
 */

import type { EntityId, ISODateString } from "./common";

/** Who/what a report targets. */
export type ReportEntityType = "user" | "couple" | "post" | "comment" | "message";

/** User-facing report categories. Maps to the ReportDialog reasons. */
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

/** A user-submitted report. Mirrors Firestore `reports` with full context. */
export interface Report {
  id: EntityId;
  reporterId: EntityId;
  /** Whom/what was reported, plus its type. */
  entityType: ReportEntityType;
  entityId: EntityId;
  /** The structured category the reporter chose. */
  reason: ReportReason;
  /** Free-form description from the reporter. */
  details?: string | null;
  /** System-assigned priority based on category + signals (not reporter-chosen). */
  priority: RiskPriority;
  status: ReportStatus;
  /** Admin who closed it + when, for the audit trail. */
  handledByAdminId?: EntityId | null;
  resolutionNote?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Risk signals emitted by content scanning. Written ONLY by trusted server-side
 * processes (this app's Admin SDK for in-band message send; a Cloud Function
 * for batch/backfill). Clients can never write these, and the collection is
 * read-only — so a user cannot zero-out their own risk score.
 */
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
  /** User id these signals are about. */
  targetUserId: EntityId;
  type: RiskSignalType;
  /** Opaque context — e.g. a message id, or a short sanitized summary. */
  context: string;
  /** Source of the signal. */
  source: "client_message_send" | "admin" | "cloud_function";
  /** 0–100, additive across flags — kept server-side only. */
  score: number;
  createdAt: ISODateString;
}

/** Blocking. Doc id is the canonical pair `blocker_blocked`; effectively bidirectional for privacy. */
export interface Block {
  id: EntityId; // canonicalPairId(blockerId, blockedId)
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
