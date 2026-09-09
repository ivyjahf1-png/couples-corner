/**
 * Couples Corner — feature-interface types.
 *
 * These describe what UI components consume. They mirror the Firestore models
 * in `lib/models` (same field names where they overlap) but stay view-shaped —
 * preformatted labels, optimistic flags, navigation targets — so pages can swap
 * demo fixtures for Firestore reads without changing UI.
 */

export type ProfileKind = "person" | "couple";

/** Filter parameters for /discover — maps cleanly to Firestore query fields. */
export interface DiscoveryFilters {
  query: string;
  location: string;
  /** Inclusive min/max ages; null = no filter. */
  ageRange: { min: number; max: number } | null;
  interests: string[];
  profileType: "all" | "people" | "couples";
  /** Relationship status preference (single / coupled / any). */
  relationshipStatus: "any" | "single" | "coupled";
  /** Couples-only: what the profile is looking for. */
  lookingFor: string | null;
}

export const defaultDiscoveryFilters: DiscoveryFilters = {
  query: "",
  location: "",
  ageRange: null,
  interests: [],
  profileType: "all",
  relationshipStatus: "any",
  lookingFor: null,
};

/** What a ConnectionButton should render, per lib/models connections.ts. */
export type ConnectionState = "none" | "outgoing_pending" | "incoming_pending" | "connected" | "self";

export interface ProfileCardView {
  id: string;
  name: string;
  kind: ProfileKind;
  location: string;
  bio: string;
  interests: string[];
  /** Count of interests shared with the signed-in user (computed server-side later). */
  sharedInterests?: number;
  connection: ConnectionState;
  /** Firestore request/connection doc id when an action (accept/decline/cancel/remove) is applicable. */
  requestId?: string;
  href?: string;
  age?: number;
  /** Profile photo / avatar URL. */
  avatarUrl?: string | null;
  /** Whether the signed-in user has blocked this person (drives action enablement). */
  blockedByMe?: boolean;
}

/** View model for /notifications items — mirrors models/notifications.ts. */
export interface NotificationView {
  id: string;
    kind: "connection_request" | "connection_accepted" | "connection_declined" | "message" | "reaction" | "comment" | "system";
  text: string;
  at: string;
  unread: boolean;
  /** Where tapping the notification should navigate. */
  href?: string;
}

/** View model for the /messages conversation list. */
export interface ConversationSummaryView {
  id: string;
  name: string;
  kind: ProfileKind;
  preview: string;
  at: string;
  unread: number;
  /** Whether the conversation participant is someone the user has blocked. */
  blocked?: boolean;
}

/** A single message bubble — mirrors models/messaging.ts Message. */
export interface MessageView {
  id: string;
  sender: "me" | "them";
  body: string;
  at: string;
  /** Optimistic send status; "sending"/"failed" exist before Firestore ack. */
  status?: "sending" | "sent" | "failed";
}

/** View model for /feed posts — mirrors models/social.ts Post. */
export interface FeedPostView {
  id: string;
  authorName: string;
  authorKind: ProfileKind;
  authorHref?: string;
  at: string;
  body: string;
  /** Number of attached media items (rendered as a placeholder grid). */
  mediaCount?: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  /** Only the author (or an admin) may delete; drives the post menu. */
  canDelete: boolean;
  comments?: FeedCommentView[];
}

export interface FeedCommentView {
  id: string;
  authorName: string;
  authorKind?: ProfileKind;
  at: string;
  body: string;
}

/** View model for /matches connection rows. */
export interface ConnectionRowView {
  id: string;
  name: string;
  kind: ProfileKind;
  location: string;
  at: string;
  /** Incoming (act on), outgoing (cancel), or connected (message/remove). */
  connection: "incoming_pending" | "outgoing_pending" | "connected";
  connectionId?: string;
  blocked?: boolean;
}

/** View model for the blocked-users list (/settings/blocked). */
export interface BlockedUser {
  /** Canonical block doc id (pair of blocker + blocked). */
  id: string;
  targetUid: string;
  displayName: string;
  kind: ProfileKind;
  /** ISO date string of when the block was created. */
  blockedAt?: string;
}
