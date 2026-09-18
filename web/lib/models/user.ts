export type UserMediaType = "image" | "video";

export type PostVisibility = "public" | "friends" | "private";

export type ProfileVisibility = "public" | "connections" | "private";

export interface ProfilePhoto {
  id?: string;
  storagePath: string;
  isPrimary: boolean;
  publicUrl?: string;
}

export interface User {
  id: string;
  authUid: string;
  email: string;
  emailVerified: boolean;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  orientation: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  occupation: string | null;
  locationPoint: { latitude: number; longitude: number } | null;
  interests: string[];
  relationshipStatus: string | null;
  profileType: "single" | "coupled" | "open" | null;
  onboardingCompleted: boolean;
  role: "user" | "admin";
  status: "active" | "suspended" | "deactivated";
  lastActiveAt: string | null;
  photos: ProfilePhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  profileType: "single" | "coupled" | "open" | null;
  bio: string | null;
  interests: string[];
  location: string | null;
  gender: string | null;
  orientation: string | null;
  occupation: string | null;
  genotype: string | null;
  country: string | null;
  photos: ProfilePhoto[];
  name: string;
  kind: "person" | "couple";
  visibility: ProfileVisibility;
  dateOfBirth: string | null;
  relationshipStatus: string | null;
  lookingFor?: string | null;
  discoverable?: boolean;
  preferences?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type Profile = UserProfile;

export interface UserMedia {
  id: string;
  userId: string;
  storagePath: string;
  mediaType: UserMediaType;
  caption: string | null;
  isProfilePhoto: boolean;
  sortOrder: number;
  createdAt: string;
  publicUrl?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  content: string;
  mediaUrls: string[];
  visibility: PostVisibility;
  createdAt: string;
  updatedAt: string;
}

export const MAX_POST_MEDIA = 4;
export { MAX_USER_MEDIA_BYTES as MAX_MEDIA_BYTES, USER_MEDIA_MIME_TYPES as ALLOWED_MEDIA_TYPES } from "@/lib/utils/media-upload";
