/** Client-safe view model for syndicated moments. */

/**
 * The reaction kinds persisted in `moment_reactions.kind` (migration 036).
 *
 * NOTE: the table carries `unique (moment_id, user_id)`, so a member has at most
 * ONE reaction per moment — tapping a different emoji swaps the existing row
 * rather than adding a second one. Per-kind numbers below are therefore
 * "how many members chose this emoji", not "how many taps on this button".
 */
export type ReactionKind = "like" | "love" | "fire" | "laugh";

/** Reaction totals split by kind, for the per-kind counters in the feed. */
export type ReactionTally = Partial<Record<ReactionKind, number>>;

export interface MomentView {
  id: string;
  userId: string;
  content: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  authorName: string | null;
  authorAvatarUrl: string | null;
  createdAt: string;
  /** Number of members who reacted. 0 when there is no engagement yet. */
  reactionCount: number;
  /** Reaction totals per kind, so each button can show its own number. */
  reactionKinds: ReactionTally;
  /** Number of comments. 0 when there are none. */
  commentCount: number;
  /** True when the *viewing* member has reacted - drives the filled heart. */
  reactedByMe: boolean;
  /** Which emoji the viewing member used, so the right button is highlighted. */
  myReactionKind: ReactionKind | null;
  /** True when the viewing member authored the moment (own-post affordances). */
  isMine: boolean;
  /** Follower count for the author, and whether the viewer follows them. */
  authorFollowerCount: number;
  amFollowingAuthor: boolean;
}

/** A single comment, as rendered in the feed's comment sheet. */
export interface MomentCommentView {
  id: string;
  userId: string;
  authorName: string | null;
  /** Author avatar, resolved server-side (see fetchAuthors). */
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
}