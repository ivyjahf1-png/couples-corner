import type {
  AppRole,
  AuditableDocument,
  EntityId,
  ISODateString,
  UserStatus,
} from "./common";

/**
 * A platform account. Identity (email, password, providers) lives in Firebase
 * Auth; this document holds the public/private profile data and app role.
 */
export interface User extends AuditableDocument {
  /** The Firebase Auth UID this document is bound to (tied at Auth wiring time). */
  authUid: EntityId;
  email: string;
  emailVerified: boolean;
  /** Unique, user-chosen handle used in public URLs `/u/[username]`. */
  username: string;
  displayName: string;
  avatarUrl?: string | null;
    dateOfBirth?: string | null;
  gender?: string | null;
  orientation?: string | null;
  bio?: string | null;
  location?: string | null;
  locationPoint?: { latitude: number; longitude: number } | null;
  interests: string[];
  /** Relationship identity for matching and privacy. */
  relationshipStatus?: string | null;
  /** "single" | "coupled" | "open" — kept as a free string to align with the model above. */
  profileType?: "single" | "coupled" | "open" | null;
  onboardingCompleted: boolean;
  /** Persisted for server-side authorization and mirrored into custom claims. */
  role: AppRole;
  status: UserStatus;
  lastActiveAt?: ISODateString | null;
  /**
   * Profile photo gallery. `photos[0]` is the primary photo; `photos[1..n]`
   * are additional gallery items. Each entry stores a storage path — clients
   * resolve the URL via the Storage rules (read-only, authenticated).
   */
  photos: ProfilePhoto[];
}

/** How discoverable / readable a profile is. */
export type ProfileVisibility = "public" | "connections" | "private";

/** A gallery photo attached to a user profile. */
export interface ProfilePhoto {
  id: EntityId;
  storagePath: string;
  caption?: string | null;
  isPrimary: boolean;
}

/** Extended, 1:1 profile document for a user. */
export interface UserProfile extends AuditableDocument {
  userId: EntityId;
  displayName: string;
  visibility: ProfileVisibility;
  /** Whether the user opts into being shown in discover/search. */
  discoverable: boolean;
  /**
   * Profile photo gallery. `photos[0]` is the primary photo; `photos[1..n]`
   * are additional gallery items. Each entry stores a storage path — clients
   * resolve the URL via the Storage rules (read-only, authenticated).
   */
  photos: ProfilePhoto[];
  /** Matching preferences surfaced to potential connections. */
  lookingFor?: string | null;
  interests: string[];
  bio?: string | null;
  location?: string | null;
  gender?: string | null;
  orientation?: string | null;
  dateOfBirth?: string | null;
  relationshipStatus?: string | null;
  profileType?: "single" | "coupled" | "open" | null;
  preferences: {
    notifyOnConnection: boolean;
    notifyOnMessages: boolean;
    showOnlineStatus: boolean;
  };
}

/**
 * Backward-compatible alias for `UserProfile`.
 * Prefer `UserProfile` in new code.
 */
export type Profile = UserProfile;