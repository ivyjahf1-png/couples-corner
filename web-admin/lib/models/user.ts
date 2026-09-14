import type {
  AppRole,
  AuditableDocument,
  EntityId,
  ISODateString,
  UserStatus,
} from "./common";

/** A platform account. */
export interface User extends AuditableDocument {
  authUid: EntityId;
  email: string;
  emailVerified: boolean;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  orientation?: string | null;
  bio?: string | null;
  location?: string | null;
  country?: string | null;
  occupation?: string | null;
  locationPoint?: { latitude: number; longitude: number } | null;
  interests: string[];
  relationshipStatus?: string | null;
  profileType?: "single" | "coupled" | "open" | null;
  onboardingCompleted: boolean;
  role: AppRole;
  status: UserStatus;
  lastActiveAt?: ISODateString | null;
  photos: ProfilePhoto[];
  isDemo?: boolean;
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
  discoverable: boolean;
  photos: ProfilePhoto[];
  lookingFor?: string | null;
  interests: string[];
  bio?: string | null;
  location?: string | null;
  country?: string | null;
  gender?: string | null;
  orientation?: string | null;
  dateOfBirth?: string | null;
  relationshipStatus?: string | null;
  occupation?: string | null;
  genotype?: string | null;
  profileType?: "single" | "coupled" | "open" | null;
  preferences: {
    notifyOnConnection: boolean;
    notifyOnMessages: boolean;
    showOnlineStatus: boolean;
  };
}

/** Backward-compatible alias for `UserProfile`. */
export type Profile = UserProfile;
