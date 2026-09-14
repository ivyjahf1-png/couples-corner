/**
 * Couples Corner — shared / foundational domain types.
 * These are intentionally database-agnostic.
 */

/** Stable document id. */
export type EntityId = string;

/** ISO-8601 UTC timestamp string. */
export type ISODateString = string;

/** Application role persisted on the user. */
export type AppRole = "user" | "admin";

/** Account lifecycle status. */
export type UserStatus = "active" | "suspended" | "deactivated";

/** Base shape shared by every top-level document. */
export interface AuditableDocument {
  id: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Basic geo point (future-proofing for location-based discovery). */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}
