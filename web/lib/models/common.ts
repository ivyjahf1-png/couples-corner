/**
 * Couples Corner — shared / foundational domain types.
 *
 * These are intentionally database-agnostic: they describe the logical shape
 * of the content model and are designed to map cleanly onto Cloud Firestore
 * documents when that is wired up. No Firebase SDK types are imported here.
 */

/** Stable document id (Firestore document id when implemented). */
export type EntityId = string;

/**
 * ISO-8601 UTC timestamp string. When we move to Firebase these become
 * Firestore `serverTimestamp()` values serialized on read.
 */
export type ISODateString = string;

/** Application role persisted on the user and mirrored into Auth custom claims. */
export type AppRole = "user" | "admin";

/** Account lifecycle status. */
export type UserStatus = "active" | "suspended" | "deactivated";

/**
 * Base shape shared by every top-level Firestore document.
 * The `id` is the document id; security rules must treat it as immutable.
 */
export interface AuditableDocument {
  id: EntityId;
  createdAt: ISODateString;
  /** Firestore merge/`serverTimestamp()` on every write. */
  updatedAt: ISODateString;
}

/** Basic geo point (future-proofing for location-based discovery). */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}