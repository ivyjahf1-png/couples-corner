/**
 * Couples Corner — content model.
 *
 * Re-exports the core domain types so consumers can import them from one place,
 * e.g. `import type { User, Post } from "@/lib/models"`.
 *
 * These types are Firebase-agnostic on purpose: nothing here touches the
 * Firebase SDK. See `./README.md` for the entity relationships and the planned
 * Firestore mapping.
 */

export type {
  AppRole,
  AuditableDocument,
  EntityId,
  GeoPoint,
  ISODateString,
  UserStatus,
} from "./common";

export type {
  Profile,
  ProfilePhoto,
  ProfileVisibility,
  User,
  UserProfile,
} from "./user";

export type {
  CoupleMember,
  CoupleMemberRole,
  CoupleProfile,
} from "./couple";

export type {
  Connection,
  ConnectionRequest,
  ConnectionRequestStatus,
} from "./connections";

export type {
  Conversation,
  ConversationParticipant,
  ConversationType,
  Message,
  MessageMedia,
  MessageType,
} from "./messaging";

export type {
  Comment,
  Like,
  Post,
  PostMedia,
  PostMediaKind,
  PostVisibility,
  Reaction,
  ReactionType,
} from "./social";

export type {
  Notification,
  NotificationType,
} from "./notifications";

export type {
  Block,
  ModerationAction,
  Report,
  ReportEntityType,
  ReportReason,
  ReportStatus,
  RiskFlag,
  RiskPriority,
  RiskSignalType,
} from "./safety";

export type {
  ContentCategory,
  ContentItem,
  ContentPlacement,
  ContentStatus,
  MediaType,
} from "./content";

// ProfileVisibility/ProfilePhoto are re-exported from ./user (above).
export { VISIBILITY_OPTIONS } from "./profile";