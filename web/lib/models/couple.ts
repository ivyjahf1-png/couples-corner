import type { AuditableDocument, EntityId, ISODateString } from "./common";

/** A couple's public-facing profile, shared by exactly two member users. */
export interface CoupleProfile extends AuditableDocument {
  /** Unique handle used in public URLs `/couple/[slug]`. */
  slug: string;
  name: string;
  description?: string | null;
  story?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  lookingFor?: string | null;
  tags: string[];
  isPrivate: boolean;
  /** Exactly two member user ids (normalized order for lookups). */
  memberIds: [EntityId, EntityId];
  /** The user who created the couple profile. */
  createdById: EntityId;
}

export type CoupleMemberRole = "owner" | "partner";

/** Join relation between a user and a couple profile. */
export interface CoupleMember {
  coupleId: EntityId;
  userId: EntityId;
  role: CoupleMemberRole;
  joinedAt: ISODateString;
}