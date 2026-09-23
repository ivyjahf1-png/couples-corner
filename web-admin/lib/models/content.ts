/**
 * Couples Corner — promotional content & advertisement model.
 */

import type { EntityId, ISODateString } from "./common";

export type ContentCategory = "advertisement" | "photo" | "video" | "announcement" | "featured";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type MediaType = "image" | "video";

export type ContentPlacement =
  | "auth" | "hero" | "homepage" | "dashboard" | "discover"
  | "feed" | "matches" | "messages" | "events" | "testimonials"
  | "notifications";

export const CONTENT_CATEGORIES: ContentCategory[] = [
  "advertisement", "photo", "video", "announcement", "featured",
];
export const CONTENT_STATUSES: ContentStatus[] = [
  "draft", "scheduled", "published", "archived",
];
export const CONTENT_PLACEMENTS: ContentPlacement[] = [
  "auth", "hero", "homepage", "dashboard", "discover", "feed", "matches",
  "messages", "events", "testimonials", "notifications",
];
/**
 * Read a scheduling value from an API/Server-Action payload.
 *
 * Canonical keys are `start_date` / `end_date` (snake_case, matching the
 * `content.start_at` / `content.end_at` DB columns after translation).
 * Legacy camelCase `startAt` / `endAt` keys from older cached clients are
 * still accepted, plus the short `start` / `end` aliases. Canonical keys
 * always win when more than one is present.
 *
 * @param body   Parsed request body (or Server Action payload object).
 * @param which  "start" | "end"
 * @returns The raw schedule value, or `undefined` when no key is present.
 */
export function readScheduleValue(
  body: Record<string, unknown>,
  which: "start" | "end"
): unknown {
  if (typeof body !== "object" || body === null) return undefined;
  const canonical = `${which}_date`;   // start_date / end_date
  const camelCase = `${which}At`;      // startAt / endAt
  const short = which;                 // start / end
  if (body[canonical] !== undefined && body[canonical] !== null) return body[canonical];
  if (body[camelCase] !== undefined && body[camelCase] !== null) return body[camelCase];
  return body[short];
}

/**
 * Normalize a schedule value into a full ISO-8601 timestamp string suitable
 * for the Postgres `timestamptz` columns `content.start_at` / `end_at`.
 *
 * Accepts:
 *  - full ISO strings ("2026-09-20T12:00:00.000Z", "2026-09-20T12:00:00+02:00")
 *  - datetime-local input values ("2026-09-20T12:00") — interpreted as LOCAL
 *    time, exactly how the browser produced them
 *  - plain dates ("2026-09-20") — midnight local time
 *  - Date objects and epoch-millisecond numbers
 *
 * Returns `null` for empty / unparseable values so callers can report a
 * validation error instead of letting Postgres reject the insert.
 */
export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // datetime-local / plain-date values have no zone designator. `new Date()`
  // would parse them as UTC in some engines and local in others; parse them
  // explicitly as LOCAL time so what the admin picked is what is stored.
  const naive = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(trimmed);
  if (naive) {
    const [, y, m, d, h = "0", min = "0", sec = "0"] = naive;
    const date = new Date(
      Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(sec)
    );
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export const MEDIA_TYPES: MediaType[] = ["image", "video"];

export interface ContentItem {
  id: EntityId;
  category: ContentCategory;
  title: string;
  description?: string;
  mediaType: MediaType;
  /** Primary / first media URL (backward-compatible). */
  mediaUrl: string;
  /** All media URLs — up to 10 photos/videos. */
  mediaUrls: string[];
  /** Storage URL of the thumbnail / poster image. */
  thumbnailUrl?: string;
  /** Optional CTA button label. */
  buttonText?: string;
  /** Optional CTA destination (external URL or in-app path). Validated server-side. */
  destinationUrl?: string;
  placement: ContentPlacement;
  status: ContentStatus;
  priority: number;
  startAt: ISODateString;
  endAt: ISODateString;
  targetAudience?: string;
  /** Meetup venue / location (events placement). */
  location?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy: string;
  updatedBy: string;
}

/** Upload constraints enforced in the server action (mirror of storage.rules). */
export const CONTENT_UPLOAD = {
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4", "video/webm"],
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  maxFiles: 10,
} as const;
