/**
 * View models for the Likes surfaces.
 *
 * CLIENT-SAFE ON PURPOSE. `lib/server/likes.ts` starts with `import
 * "server-only"`, so a Client Component cannot import types from it - the build
 * fails outright. These interfaces therefore live here, free of any server
 * import, and `lib/server/likes.ts` re-exports them so existing server imports
 * keep working unchanged.
 */
export interface LikeView {
  id: string;
  name: string;
  kind: "person" | "couple";
  location: string;
  avatarUrl: string | null;
  isBot: boolean;
  isBlurred: boolean;
  at: string;
}

/**
 * One "someone liked your post" row.
 *
 * Carries BOTH the liker and the media they reacted to, so the Likes page can
 * render a single self-contained row and deep-link straight to the post. The
 * media fields are nullable because a moment can be deleted: the reaction row
 * cascades away with it, but a moment whose media failed to resolve should still
 * render the liker rather than dropping the whole row.
 */
export interface PostLikeView {
  id: string;
  /** The liker. */
  likerName: string;
  likerAvatarUrl: string | null;
  likerUserId: string;
  /** The moment that was liked, for the deep link. */
  momentId: string | null;
  momentMediaUrl: string | null;
  /** "image" | "video" | null - drives "liked your photo" vs "your video". */
  momentMediaType: "image" | "video" | null;
  /** Always true here (we only query the viewer's own posts), kept explicit. */
  isOwnPost: boolean;
  kind: "like" | "love" | "fire" | "laugh" | null;
  at: string;
}
