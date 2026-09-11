/**
 * Couples Corner — promotional content & advertisement model.
 *
 * Advertisements, announcements, and featured media are all "content" — the
 * same doc shape, differentiated by `category`. Only admins (verified server-
 * side via the Admin SDK) can write to the `content` collection; public reads
 * are time/placement filtered so unpublished or expired content never leaks.
 *
 * SECURITY: every field that affects what users see (status, placement,
 * schedule) is server-managed. Clients read-only. Firestore rules deny all
 * client writes; Admin SDK writes happen in `lib/server/content.ts` inside the
 * same transaction as the audit-log entry.
 */

import type { EntityId, ISODateString } from "./common";

export type ContentCategory = "advertisement" | "photo" | "video" | "announcement" | "featured";

export type ContentStatus = "draft" | "scheduled" | "published" | "archived";

export type MediaType = "image" | "video";

/** Where on the site a piece of content may appear. */
export type ContentPlacement =
  | "hero"
  | "homepage"
  | "dashboard"
  | "discover"
  | "feed"
  | "matches"
  | "messages";

export const CONTENT_CATEGORIES: ContentCategory[] = [
  "advertisement",
  "photo",
  "video",
  "announcement",
  "featured",
];

export const CONTENT_STATUSES: ContentStatus[] = [
  "draft",
  "scheduled",
  "published",
  "archived",
];

export const CONTENT_PLACEMENTS: ContentPlacement[] = [
  "hero",
  "homepage",
  "dashboard",
  "discover",
  "feed",
  "matches",
  "messages",
];

export const MEDIA_TYPES: MediaType[] = ["image", "video"];

export interface ContentItem {
  id: EntityId;
  category: ContentCategory;
  title: string;
  description?: string;
  mediaType: MediaType;
  /** Storage URL of the full-resolution media (image or video). */
  mediaUrl: string;
  /** Storage URL of the thumbnail / poster image. */
  thumbnailUrl?: string;
  /** Optional CTA button label, e.g. "Learn more". */
  buttonText?: string;
  /** Optional CTA destination (external URL or in-app path). Validated server-side. */
  destinationUrl?: string;
  /** Where the content may appear. */
  placement: ContentPlacement;
  status: ContentStatus;
  /** Sort order within a placement — lower appears first. */
  priority: number;
  /** ISO date-time when the content becomes eligible to display. */
  startAt: ISODateString;
  /** ISO date-time when the content stops displaying. */
  endAt: ISODateString;
  /** Who the content is intended for (free-form label, e.g. "new-users", "all"). */
  targetAudience?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy: string; // admin uid
  updatedBy: string; // admin uid
}

/** Upload constraints enforced in the server action (mirror of storage.rules). */
export const CONTENT_UPLOAD = {
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4", "video/webm"],
  maxImageBytes: 10 * 1024 * 1024, // 10 MB
  maxVideoBytes: 100 * 1024 * 1024, // 100 MB
} as const;
