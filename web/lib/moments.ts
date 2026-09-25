/** Client-safe view model for syndicated moments. */
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
  /** Number of comments. 0 when there are none. */
  commentCount: number;
  /** True when the *viewing* member has reacted - drives the filled heart. */
  reactedByMe: boolean;
  /** True when the viewing member authored the moment (own-post affordances). */
  isMine: boolean;
}

/** A single comment, as rendered in the feed's comment sheet. */
export interface MomentCommentView {
  id: string;
  userId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}