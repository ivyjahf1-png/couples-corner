/**
 * DEMO DATA — structural placeholder content ONLY.
 *
 * None of the people, couples, conversations, or notifications below are real.
 * These fixtures exist purely so the authenticated-app UI can be designed with
 * realistic shapes (card layouts, list states, thread anatomy) before Firebase
 * is connected. Every consumer must render these through components that make
 * no claim of authenticity, and all of this is deleted/replaced once Firestore
 * reads land.
 */

export interface DemoPerson {
  id: string;
  name: string;
  partnerName?: string;
  kind: "person" | "couple";
  location: string;
  bio: string;
  interests: string[];
  sharedInterests?: number;
  status: "new" | "pending" | "connected";
}

export const demoSuggested: DemoPerson[] = [
  {
    id: "p1",
    name: "Maya",
    kind: "person",
    location: "Portland, OR",
    bio: "Coffee-shop wanderer and amateur ceramicist. Looking for genuine friendships first.",
    interests: ["Ceramics", "Hiking", "Jazz"],
    sharedInterests: 3,
    status: "new",
  },
  {
    id: "p2",
    name: "Jordan & Taylor",
    partnerName: "Taylor",
    kind: "couple",
    location: "Austin, TX",
    bio: "Seven years in, still arguing about the best taco truck. Board-game night hosts.",
    interests: ["Board games", "Cooking", "Travel"],
    sharedInterests: 2,
    status: "new",
  },
  {
    id: "p3",
    name: "Priya",
    kind: "person",
    location: "Seattle, WA",
    bio: "Trail runner, plant hoarder, and terrible-but-enthusiastic karaoke participant.",
    interests: ["Running", "Plants", "Karaoke"],
    sharedInterests: 1,
    status: "pending",
  },
  {
    id: "p4",
    name: "Sam & Riley",
    partnerName: "Riley",
    kind: "couple",
    location: "Denver, CO",
    bio: "Weekend climbers saving for a van. Always up for trail recommendations.",
    interests: ["Climbing", "Van life", "Photography"],
    sharedInterests: 2,
    status: "connected",
  },
];

export interface DemoActivity {
  id: string;
  kind: "connection" | "message" | "moment" | "system";
  text: string;
  at: string;
}

export const demoActivity: DemoActivity[] = [
  { id: "a1", kind: "system", text: "Welcome to Couples Corner! Your profile is 60% complete.", at: "Just now" },
  { id: "a2", kind: "message", text: "Demo conversation preview — “Weekend plans?”", at: "2h ago" },
  { id: "a3", kind: "connection", text: "Demo connection request from a sample profile.", at: "Yesterday" },
];

export interface DemoNotification {
  id: string;
  kind: "connection_request" | "message" | "system";
  text: string;
  at: string;
  unread: boolean;
}

export const demoNotifications: DemoNotification[] = [
  { id: "n1", kind: "connection_request", text: "Sample profile sent you a connection request.", at: "1h ago", unread: true },
  { id: "n2", kind: "message", text: "New message in a sample conversation.", at: "3h ago", unread: true },
  { id: "n3", kind: "system", text: "Tip: add a few interests to improve suggestions.", at: "2d ago", unread: false },
];

export interface DemoConversation {
  id: string;
  name: string;
  kind: "person" | "couple";
  preview: string;
  at: string;
  unread: number;
}

export const demoConversations: DemoConversation[] = [
  { id: "c1", name: "Jordan & Taylor", kind: "couple", preview: "Board-game night Saturday? We'll bring snacks.", at: "2h", unread: 2 },
  { id: "c2", name: "Maya", kind: "person", preview: "That pottery class looks fun!", at: "Yesterday", unread: 0 },
  { id: "c3", name: "Sam & Riley", kind: "couple", preview: "Thanks for the trail tip 🏔", at: "Mon", unread: 0 },
];

export interface DemoMessage {
  id: string;
  sender: "me" | "them";
  body: string;
  at: string;
}

export const demoThread: DemoMessage[] = [
  { id: "m1", sender: "them", body: "Hey! Saw you're into board games too — what's your current favourite?", at: "10:02" },
  { id: "m2", sender: "me", body: "Probably Wingspan at the moment, though we rotate a lot.", at: "10:11" },
  { id: "m3", sender: "them", body: "Great taste. Board-game night Saturday? We'll bring snacks.", at: "10:13" },
];

/*
 * ---------------------------------------------------------------------------
 * View-model fixtures (lib/feature/types.ts shapes) — the exact objects the
 * UI components consume, so swapping in Firestore reads later is a query swap.
 * ---------------------------------------------------------------------------
 */
import type {
  ConversationSummaryView,
  FeedPostView,
  NotificationView,
  ProfileCardView,
} from "@/lib/feature/types";

const connectionByStatus = {
  new: "none",
  pending: "outgoing_pending",
  connected: "connected",
} as const;

export const demoProfileViews: ProfileCardView[] = demoSuggested.map((p) => ({
  id: p.id,
  name: p.name,
  kind: p.kind,
  location: p.location,
  bio: p.bio,
  interests: p.interests,
  sharedInterests: p.sharedInterests,
  connection: connectionByStatus[p.status],
  href: p.kind === "couple" ? `/couple/${p.id}` : `/u/${p.id}`,
}));

export const demoNotificationViews: NotificationView[] = [
  { id: "n1", kind: "connection_request", text: "Sample profile sent you a connection request.", at: "1h ago", unread: true, href: "/matches" },
  { id: "n2", kind: "message", text: "New message in a sample conversation.", at: "3h ago", unread: true, href: "/messages" },
  { id: "n3", kind: "reaction", text: "Sample profile reacted to a sample post.", at: "Yesterday", unread: false, href: "/feed" },
  { id: "n4", kind: "system", text: "Tip: add a few interests to improve suggestions.", at: "2d ago", unread: false },
];

export const demoConversationViews: ConversationSummaryView[] = demoConversations.map((c) => ({
  id: c.id,
  name: c.name,
  kind: c.kind,
  preview: c.preview,
  at: c.at,
  unread: c.unread,
}));

export const demoFeedPosts: FeedPostView[] = [
  {
    id: "fp1",
    authorName: "Demo User",
    authorKind: "person",
    at: "Just now",
    body: "We're new here! Excited to meet people who love slow mornings and long walks.",
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    canDelete: true,
    comments: [],
  },
  {
    id: "fp2",
    authorName: "Jordan & Taylor",
    authorKind: "couple",
    at: "2h ago",
    body: "Sample post: board-game night was a success. What should we play next?",
    mediaCount: 2,
    likeCount: 4,
    commentCount: 2,
    likedByMe: false,
    canDelete: false,
    comments: [
      { id: "fc1", authorName: "Maya", at: "1h ago", body: "Sample comment — Wingspan again!" },
      { id: "fc2", authorName: "Sam & Riley", at: "45m ago", body: "Sample comment — we'll bring snacks." },
    ],
  },
];

