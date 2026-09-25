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
}
