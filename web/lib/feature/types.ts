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

/** Conversation participant summary card (top of chat) */
export interface ConversationParticipantSummary {
  id: string;
  name: string;
  kind: "person" | "couple";
  avatarUrl: string | null;
  verified: boolean;
  location: string | null;
  /**
   * Age in whole years, derived from `date_of_birth` at read time.
   *
   * Computed, never stored: a stored age goes stale every birthday, and two
   * copies of it can disagree. See `ageFromDateOfBirth` in `lib/feature/types`.
   *
   * OPTIONAL and null when the member has not shared a date of birth. Absence
   * of data must read as "not shared", never as a guess.
   */
  age?: number | null;
  /**
   * The member's own self-described relationship status, verbatim.
   *
   * OPTIONAL. Displayed as the status chip on the intro card. It is THEIR
   * claim about themselves, so it is never interpreted, reworded or inferred.
   */
  relationshipStatus?: string | null;
  lifestyleTags: string[];
  photos: { id?: string; storagePath?: string; isPrimary?: boolean; publicUrl?: string | null }[];
  /**
   * Compatibility score, 0..100.
   *
   * OPTIONAL and currently never set. There is no compatibility engine in the
   * product, and this was previously a hardcoded 78 rendered as "78% match" —
   * a fabricated number inviting a member to judge a real person on data the
   * product invented. It stays optional so a future, genuine implementation can
   * populate it without any caller being forced to invent a value today.
   */
  personalitySimilarity?: number;
}

/** Which of the six call states a call can be in. Mirrors the DB CHECK. */
export type CallStatus =
  | "ringing"
  | "answered"
  | "missed"
  | "declined"
  | "cancelled"
  | "ended";

/** One entry in a conversation's call history. */
export interface CallLogEntry {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  mode: "audio" | "video";
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
}

/**
 * Whether a call entry should render as the "Missed …" card.
 *
 * A call that connected and then ended is NOT missed, however it finished — the
 * two people spoke, and calling that "missed" would be both false and
 * gratuitously accusatory. Only the states where no media ever flowed qualify,
 * which is why this is a predicate rather than a `status === "missed"` test at
 * the call site: a declined call is equally unanswered, and reading it as
 * connected would silently hide it.
 */
export function isMissedCall(entry: CallLogEntry): boolean {
  return entry.status === "missed" || entry.status === "declined";
}

/** Human label for a missed-call card, e.g. "Missed Video Call". */
export function missedCallLabel(mode: "audio" | "video"): string {
  return mode === "video" ? "Missed Video Call" : "Missed Audio Call";
}

/**
 * Whole years from a `date_of_birth` to now, or null when there is no usable
 * date.
 *
 * WHY THIS EXISTS AS A FUNCTION AND NOT A COLUMN ─────────────────────────────
 * Age is a function of time. Storing it means every member's value is wrong
 * from their next birthday onward, and wrong differently for every copy of it
 * in the system. Deriving it at read time means there is exactly one rule, and
 * it is right everywhere at once.
 *
 * WHY IT RETURNS NULL RATHER THAN GUESSING ───────────────────────────────────
 * A profile with no date of birth yields null, and the UI omits the age chip
 * entirely. Substituting a default (18, 0, or a midpoint) would put a number
 * on a real person that they never gave us — in a dating app that is the kind
 * of detail a member is entitled to rely on, so a plausible-looking wrong age
 * is worse than a missing one.
 *
 * Guards against a malformed or future date: both would otherwise render as
 * "0" or a negative age, which is nonsense on a card a member reads about a
 * stranger. Anything not a sane, past, ISO-ish date is treated as "not shared".
 *
 * @param dateOfBirth ISO date string (as stored in `profiles.date_of_birth`).
 * @param now Injectable clock, so the calculation is testable and cannot vary
 *   within a single render pass.
 */
export function ageFromDateOfBirth(
  dateOfBirth: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;

  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return null;

  // A birth date in the future is corrupt data, not a member. Reject rather
  // than render a negative age.
  if (born.getTime() > now.getTime()) return null;

  // Compare on month/day rather than dividing elapsed days by 365.25: that
  // division is off by a day across leap years, which flips the displayed age
  // for anyone whose birthday falls near a leap day.
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) {
    age -= 1;
  }

  // Sanity floor. A computed age below 0 is already excluded above; this also
  // catches absurd historic dates, which are corrupt rows rather than people.
  return age >= 0 ? age : null;
}

/** A pre-seeded chat starter for newly opened conversations */
export interface ChatStarter {
  id: string;
  body: string;
}

/** A pre-seeded chat starter for newly opened conversations */
export interface ChatStarter {
  id: string;
  body: string;
}

/** One row in the /messages conversation list. */
export interface ConversationSummaryView {
  id: string;
  name: string;
  kind: ProfileKind;
  /** Last-message preview text. */
  preview: string;
  /** Preformatted relative timestamp shown on the row's right edge. */
  at: string;
  /** Unread message count (0 hides the badge). */
  unread: number;
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
  /**
   * The author's user id. Optional because demo posts and the Discover-sourced
   * timeline have no real recipient to address.
   *
   * It is required ONLY by the per-post "Hi" deep-link, which needs a
   * conversation target. When it is absent the card hides the button rather
   * than linking somewhere inert — a "Hi" that does nothing is worse than no
   * "Hi", because it looks like the message was sent.
   */
  authorId?: string;
  /** True when this post is the signed-in member's own; hides "Hi" on it. */
  isOwn?: boolean;
  at: string;
  body: string;
  authorAvatar?: string | null;
  verified?: boolean;
  vip?: boolean;
  mediaUrls?: string[];
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
