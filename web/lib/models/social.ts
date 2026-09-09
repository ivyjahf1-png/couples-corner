import type { AuditableDocument, EntityId, ISODateString } from "./common";

export type PostVisibility = "public" | "couple" | "private";

export type PostMediaKind = "image" | "video";

export interface PostMedia {
  id: EntityId;
  kind: PostMediaKind;
  storagePath: string;
  caption?: string | null;
  /** Ordering within the post. */
  order: number;
}

/** Content published by a user and, optionally, attributed to their couple. */
export interface Post extends AuditableDocument {
  authorUserId: EntityId;
  /** Set when the post is published on behalf of a couple profile. */
  coupleId?: EntityId | null;
  content: string;
  media: PostMedia[];
  tags: string[];
  visibility: PostVisibility;
}

export type ReactionType = "like" | "love" | "celebrate";

/** A "like" on a post. Keyed conceptually by (postId, userId). */
export interface Like {
  postId: EntityId;
  userId: EntityId;
  /** The reaction kind; `"like"` is the default. */
  type: ReactionType;
  createdAt: ISODateString;
}

/**
 * Backward-compatible alias for `Like`.
 * Prefer `Like` in new code.
 */
export type Reaction = Like;

/** A comment on a post (top-level or a reply via parentId). */
export interface Comment extends AuditableDocument {
  postId: EntityId;
  authorId: EntityId;
  body: string;
  parentId?: EntityId | null;
}