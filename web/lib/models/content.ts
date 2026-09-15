/**
 * Couples Corner — promotional content & advertisement model.
 */

import type { EntityId, ISODateString } from "./common";

export type ContentCategory = "advertisement" | "photo" | "video" | "announcement" | "featured";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type MediaType = "image" | "video";

export type ContentPlacement =
  | "hero" | "homepage" | "dashboard" | "discover"
  | "feed" | "matches" | "messages";

export const CONTENT_CATEGORIES: ContentCategory[] = [
  "advertisement", "photo", "video", "announcement", "featured",
];
export const CONTENT_STATUSES: ContentStatus[] = [
  "draft", "scheduled", "published", "archived",
];
export const CONTENT_PLACEMENTS: ContentPlacement[] = [
  "hero", "homepage", "dashboard", "discover", "feed", "matches", "messages",
];
export const MEDIA_TYPES: MediaType[] = ["image", "video"];

export interface ContentItem {
  id: EntityId;
  category: ContentCategory;
  title: string;
  description?: string;
  mediaType: MediaType;
  mediaUrl: string;
  mediaUrls: string[];
  thumbnailUrl?: string;
  buttonText?: string;
  destinationUrl?: string;
  placement: ContentPlacement;
  status: ContentStatus;
  priority: number;
  startAt: ISODateString;
  endAt: ISODateString;
  targetAudience?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy: string;
  updatedBy: string;
}

export const CONTENT_UPLOAD = {
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4", "video/webm"],
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  maxFiles: 10,
} as const;
