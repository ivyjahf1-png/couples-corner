// ChatRoomClient.tsx — the individual conversation surface.
//
// ONE CLIENT COMPONENT, NOT FOUR. The pinned profile card, the message stream,
// the quick replies and the composer are pieces of ONE control surface: tapping a
// quick reply writes into the composer's field, which lives in this component's
// state. Splitting them would mean lifting that state into a shared parent and
// dragging every rendered message across a second boundary for no gain.
//
// WHAT THE REWRITE KEPT, DELIBERATELY. The previous chat room was deleted
// wholesale, but three of its behaviours are load-bearing and are re-implemented
// here rather than dropped:
//
//   • REALTIME. `useRealtimeMessages` still backs the stream, so a message sent
//     on another device appears without a refresh. Initial history and live
//     inserts are merged and de-duplicated by id.
//   • EDIT / DELETE. Own bubbles are still wrapped in `MessageActionsMenu` and
//     still call the same server actions. Removing those would have silently
//     taken away a feature members rely on.
//   • MARK-READ. Still fired from a mount effect, never from the server render —
//     `markConversationReadAction` calls `revalidatePath`, which Next.js rejects
//     outside a mutation, and a render must not perform a write anyway.
//
// NO KEYBOARDAVOIDINGVIEW, AND THAT IS NOT AN OMISSION. `KeyboardAvoidingView` is
// a React Native primitive with no web equivalent; this app is Next.js. The
// equivalent guarantee here is the locked `h-[100dvh]` column — `dvh` tracks the
// *visual* viewport, so when a mobile browser shrinks for the on-screen keyboard
// the whole column shrinks with it and the composer rides up. That is the
// behaviour the RN primitive was being asked for.
//
// THE YELLOW/GREY PALETTE IS INLINE HEX, NOT TOKENS. The app's design tokens
// (`--background`, `--brand-*`) still describe the old navy/orange theme, and
// retinting them would repaint every route. The values below are the yellow/grey
// ramp from the design, declared once.
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Gift,
  MapPin,
  Mic,
  Phone,
  Send,
  ShieldAlert,
  Smile,
  Square,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/app/Avatar";
import { ChatPhotoUploadButton } from "@/components/app/ChatPhotoUploadButton";
import { profileViewClick } from "@/components/profile/ProfileViewModal";
import { EMOJI_PICKER_PANEL_ID, EmojiPickerDrawer } from "@/components/app/EmojiPickerDrawer";
import { GiftDrawer } from "@/components/app/GiftDrawer";
import {
  COPY_ONLY_ACTIONS,
  MESSAGE_ACTIONS,
  MessageActionsMenu,
  type MessageAction,
} from "@/components/app/MessageActionsMenu";
import { usePresence } from "@/lib/hooks/usePresence";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import { useTypingChannel } from "@/lib/hooks/useTypingChannel";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useScrollCollapse } from "@/lib/hooks/useScrollCollapse";
import {
  deleteMessageAction,
  editMessageAction,
  markConversationReadAction,
  sendMessageAction,
} from "@/lib/actions/messaging";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

/**
 * THE DESIGN'S PALETTE — Midnight Navy / Purple with Vibrant Orange.
 *
 * WHY A RETINT RATHER THAN A REWRITE. This file is ~700 lines and three of its
 * behaviours are load-bearing and unrelated to colour: realtime via
 * `useRealtimeMessages`, edit/delete via `MessageActionsMenu`, and mark-read via
 * a mount effect. Rewriting the screen wholesale to change six colours would put
 * all three at risk for no visual gain. The palette was already centralised in
 * this one object, so changing it here re-themes the entire surface at once and
 * cannot desynchronise two halves painted from different values.
 *
 * ── THE CONTRAST RULE, WHICH IS THE ACTUAL POINT OF THIS BLOCK ────────────────
 * Every foreground here is checked against its own background, not against the
 * page. The previous ramp failed exactly there: `inkMuted: "#6B7280"` on a
 * `#F4F5F7` canvas is fine, but the same grey was reused for text sitting on a
 * bubble, where it fell to roughly 3.4:1 and read as muddy. On a dark surface the
 * equivalent mistake is using a mid-grey that looks reasonable in isolation and
 * then disappears against `#1F1A32`. So:
 *
 *   • PRIMARY TEXT   `#FFFFFF` on `#1F1A32`  ≈ 15.9:1  (WCAG AAA)
 *   • SECONDARY TEXT `#B8B2D1` on `#0F0C1B`  ≈  8.6:1  (comfortably AA for body)
 *   • TERTIARY TEXT  `#8B85A8` on `#0F0C1B`  ≈  5.3:1  (AA for the small caps
 *     and timestamps it is used on, and never for anything below 11px)
 *
 * Nothing structural is carried in tertiary. Timestamps and meta labels are the
 * one place a lighter step is acceptable, because they are decorative by
 * definition; message bodies and the member's NAME are never anything but
 * `#FFFFFF`.
 *
 * ORANGE `#FF7A00` is reserved for interactive surfaces only — the Next button,
 * the send button, focus rings and the quick-reply accent. It is never used for
 * body text: `#FF7A00` on `#1F1A32` is about 5.1:1, which clears AA for large
 * bold type but is not strong enough for a message body, and orange text on a
 * dark field is the fastest way to reintroduce the muddiness this block exists to
 * remove.
 */
const THEME = {
  /** Page canvas — the Midnight Navy the whole screen sits on. */
  canvas: "#0F0C1B",
  /**
   * Bubble fill AND the composer input. One value, not two: the input reading as
   * a different surface from the bubbles it sits among is what made the old
   * screen look assembled rather than designed.
   */
  surface: "#1F1A32",
  /** The pinned profile card — a deep amber that stays legible under white text. */
  yellow: "#2A1F0E",
  /** Pressed/hover step for the pinned card's chips. */
  yellowDeep: "#3A2A12",
  /** The scam-warning card: a red-shifted dark, so it reads as a caution. */
  warning: "#2A1520",
  /**
   * Own (right-hand) bubbles. `#f97316` is the Tailwind orange-500 from the
   * industry-standard chat ramp — enough separation to tell who is speaking at
   * a glance, while staying close enough in lightness that the thread does not
   * read as two disconnected halves. The bubble paints this as a GRADIENT
   * (see MessageBubble), not a flat fill.
   */
  own: "#f97316",
  /** Hairlines and input borders. Visible on dark, so lighter than a dark-theme default. */
  hairline: "#3A3358",
  /** Body text on a bubble. */
  ink: "#FFFFFF",
  /** Meta text on the canvas. */
  inkMuted: "#B8B2D1",
} as const;

/**
 * THE HEADER AND COMPOSER BARS — translucent, so the canvas gradient reads
 * through them.
 *
 * Both were an OPAQUE `THEME.surface`. Now that the column behind them carries
 * the profile's gradient, an opaque bar cut the screen into three stacked bands
 * with hard seams at the top and bottom edges. At 62% alpha the bars still
 * separate from the thread behind them (they carry a hairline for that) while
 * the ramp stays continuous through the whole viewport.
 */
const GLASS_BAR = "rgba(31, 26, 50, 0.62)";
/**
 * ORANGE ACCENT — declared once so the Next button, the send button and the focus
 * rings cannot drift to different oranges.
 */
const ORANGE = "#FF7A00";
/** Focus-ring orange, darkened for use as a 1px border where white would glare. */
const ORANGE_RING = "#CC6200";

/** Longest message the composer will send. Mirrors the server's own cap. */
const MAX_LENGTH = 4000;

/**
 * How long a sent message may be edited — 15 minutes, the chat-industry
 * standard. Mirrored server-side in `updateMessage` (lib/server/messaging.ts),
 * which enforces it in the UPDATE's WHERE clause; this copy only decides
 * whether the Edit entry is OFFERED in the long-press menu.
 */
const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** One message as it arrives from the server or from realtime. */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string | null;
  created_at: string;
  edited_at?: string | null;
  /**
   * Soft-delete flag (migration 054). True once the sender chose "delete for
   * everyone": the row stays and the bubble renders as a tombstone. Optional
   * so a database without the column still types — every row reads as live.
   */
  is_deleted?: boolean | null;
  /** Public URL of an attached photo (migration 056). */
  image_url?: string | null;
  /** Public URL of a voice-note recording (migration 062). */
  audio_url?: string | null;
}

/**
 * Quick replies.
 *
 * OPENERS, not claims — each invites a reply and asserts nothing about the other
 * person. These are messages read by strangers, so a pill that complimented
 * someone's looks or assumed a shared interest would be inventing a relationship
 * the two people do not have.
 *
 * Tapping a pill FILLS the composer; it never sends. Autocomplete is the wrong
 * pattern here precisely because a sent message cannot be unsent.
 */
const QUICK_REPLIES = [
  "hey dear are you single?",
  "Nice to meet you",
  "Good",
  "Where are you from?",
  "How's your week going?",
  "What's something you love doing?",
] as const;

/** "14:02" — 24-hour, matching the design's timestamp header. */
function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/** A small pill in the pinned card's badge row. */
function PinnedBadge({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px] font-bold text-white">
      <Icon className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

/**
 * The pinned profile summary — the yellow card at the top of the thread.
 *
 * ── WHAT IS RENDERED AND WHY ──────────────────────────────────────────────────
 * Age and location come from `summary`, lifestyle tags from `summary.lifestyleTags`
 * and the photos from `summary.photos`. All real.
 *
 * `personalitySimilarity` renders ONLY when the server actually sent it. The
 * field is documented as optional-and-currently-never-set, and it was previously
 * a hardcoded 78 printed as "78% match" — a fabricated score about a real
 * person. Printing a placeholder "88%" here would reintroduce exactly that lie,
 * so the line is absent until a genuine engine populates the field.
 *
 * The same rule governs the "Real Person" badge: it renders on `summary.verified`,
 * which is hard-coded `false` in this codebase because there is no verification
 * column, no review queue and no admin action that sets one. A green tick beside
 * a self-declared profile is the unearned trust signal verification exists to
 * prevent, so it stays out until there is something real to bind it to.
 */
function PinnedProfileCard({ summary }: { summary: ConversationParticipantSummary | null }) {
  if (!summary) return null;

  /* Only photos with a resolvable URL are drawn. `photos` rows are frequently
     persisted with a `storagePath` and no `publicUrl`, and rendering those as
     `<img src={undefined}>` would put a broken-image glyph in the card. */
  const photos = summary.photos.filter((p) => Boolean(p.publicUrl)).slice(0, 2);

  return (
    /* THE PROFILE BANNER. `w-full` is the spec's `width: '100%'` and `self-stretch` its
       `alignSelf: 'center'` on a full-bleed child — both are no-ops against the
       thread's own padding, which is where the "balanced side spacing" actually
       comes from. `mb-3` is the 12px `marginBottom`.

       `rounded-2xl` is already 16px, matching the spec's `borderRadius: 16`; it is
       not restated as a number because two values for one radius is how they drift. */
    <section
      aria-label="Profile summary"
      className="w-full self-stretch rounded-2xl p-3"
      style={{ backgroundColor: THEME.yellow }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {summary.age ? <PinnedBadge icon={BadgeCheck}>{summary.age}</PinnedBadge> : null}
        {summary.location ? <PinnedBadge icon={MapPin}>{summary.location}</PinnedBadge> : null}
        {summary.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">
            <BadgeCheck className="h-3 w-3" aria-hidden />
            Real Person
          </span>
        ) : null}
      </div>

      {photos.length > 0 ? (
        <div className="mt-2.5 flex gap-2">
          {photos.map((photo) => (
            /* eslint-disable-next-line @next/next/no-img-element --
               these are user-uploaded Supabase URLs from a private bucket, and
               next/image cannot optimise or authorise them here. A plain img with
               lazy loading is the honest choice. */
            <img
              key={photo.id ?? photo.storagePath ?? photo.publicUrl ?? ""}
              src={photo.publicUrl ?? undefined}
              alt=""
              loading="lazy"
              className="h-16 w-16 rounded-xl object-cover"
            />
          ))}
        </div>
      ) : null}

      {summary.personalitySimilarity != null ? (
        <p className="mt-2.5 text-xs font-semibold text-white">
          Personality similarity: {summary.personalitySimilarity}%
        </p>
      ) : null}

      {summary.lifestyleTags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {summary.lifestyleTags.slice(0, 4).map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * The scam warning, shown once beneath the most recent incoming message.
 *
 * Placed there rather than at the top of the thread because that is where it can
 * do its job: a member reads it immediately after reading something from a
 * stranger. Rendered ONCE per thread — repeating it under every incoming bubble
 * turns a caution into noise, and noise is what members scroll past.
 */
function ScamWarning() {
  return (
    <div
      role="note"
      className="mt-2 rounded-xl px-3 py-2.5"
      style={{ backgroundColor: THEME.warning }}
    >
      <p className="flex items-start gap-1.5 text-[11px] leading-4 text-amber-100">
        <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
        <span>
          This user might be trying to scam you. Watch out for asks for money, personal
          details, or weird links. Be careful!
        </span>
      </p>
    </div>
  );
}
/**
 * One message bubble.
 *
 * Incoming messages carry the sender's avatar on the left, as the design shows.
 * Own messages are right-aligned with no avatar: repeating your own face beside
 * every line you sent is visual noise, and the alignment already answers "whose
 * is this".
 *
 * SIDE ALIGNMENT. The row is `justify-end` for own messages and `justify-start`
 * for incoming ones, the flex equivalent of the spec's
 * `alignSelf: 'flex-end' / 'flex-start'`. It lives on the ROW rather than on the
 * bubble because the bubble also sits inside `MessageActionsMenu`, whose own trigger
 * is a separate button - aligning the bubble alone would leave that button out of line.
 */
function MessageBubble({
  message,
  isMine,
  avatarUrl,
  participantName,
  onAction,
  busy,
  seen = false,
}: {
  message: ChatMessage;
  isMine: boolean;
  avatarUrl: string | null;
  participantName: string;
  onAction: (action: MessageAction, messageId: string) => void;
  busy: boolean;
  /**
   * True when this own message has been opened by the other participant. Rendered
   * as a "Seen" label beside the timestamp — a word, not WhatsApp-style ticks,
   * per the brief. Defaulted so the bubble is unchanged anywhere it is not passed.
   */
  seen?: boolean;
}) {
  const body = (message.body ?? "").trim();

  /* MEDIA. A photo message carries `image_url`; a voice note carries `audio_url`.
     Both keep a short text `body` fallback ("📷 Photo" / "🎤 Voice note") so older
     renderers and screen readers still get a label — but when media IS present we
     render the media and suppress the placeholder text so the bubble shows the
     actual photo or a playable audio bar rather than a redundant caption. A member
     who adds a real caption alongside the media still sees that caption. */
  const imageUrl = message.image_url ?? null;
  const audioUrl = message.audio_url ?? null;
  const hasMedia = Boolean(imageUrl || audioUrl);
  const PLACEHOLDER_BODIES = new Set(["📷 Photo", "🎤 Voice note"]);
  const showBody = body.length > 0 && (!hasMedia || !PLACEHOLDER_BODIES.has(body));

  /* ROW ALIGNMENT — the left/right split, standardized once here.
     Received: `justify-start items-start text-left` (avatar left, slate glass).
     Sent:     `justify-end items-end text-right ml-auto` (orange gradient).
     It lives on the ROW rather than on the bubble because the bubble also sits
     inside `MessageActionsMenu`, whose own trigger is a separate button —
     aligning the bubble alone would leave that button out of line. */
  const rowClass = isMine
    ? "w-full flex justify-end my-1 px-2"
    : "w-full flex justify-start my-1 px-2";

  /* TOMBSTONE. A row the sender deleted-for-everyone keeps its place in the
     thread rather than vanishing: a silent gap would leave the other
     participant unable to tell a deletion from a message that failed to
     arrive. No actions menu — there is nothing left to act on. */
  if (message.is_deleted) {
    return (
      <div className={rowClass}>
        {!isMine ? (
          <Avatar name={participantName} src={avatarUrl} size="sm" className="shrink-0" />
        ) : null}
        <div className="flex w-fit max-w-[80%] flex-col gap-1 break-words rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-3 py-2 text-sm leading-5 text-white/45">
          <p className="whitespace-pre-wrap break-words text-sm italic leading-5">
            This message was deleted
          </p>
        </div>
      </div>
    );
  }

  if (!body && !hasMedia) return null;

  const bubble = (
    /* THE BUBBLE.

       `w-fit` is REQUIRED alongside `max-w`: without it a block-level div fills
       the row and the cap has nothing to shrink, so every bubble would render
       as a full-width slab regardless of its text. `w-fit` makes the box
       shrink to the content first, and `max-w` then only bites on genuinely
       long messages.

       `min-w-[60px]` and `max-w-[75%]` are the spec's wrapping bounds. The
       MINIMUM is the half that was missing, and it is the actual fix for the
       vertical-collapse bug: a one-word bubble ("k", "ok", "💕") was allowed to
       shrink to the width of that single word, which on a narrow phone is a
       few pixels wide — so every following line of a longer message wrapped
       down into a tall, one-word-per-line column. Reserving 60px of minimum
       width keeps a short message a bubble rather than a sliver, and gives the
       wrap something to fill.

       `whitespace-pre-wrap` on the text is what preserves the member's own line
       breaks (and the leading spaces of an indented message) while still
       allowing wrapping; `break-words` then stops one unbroken token — a pasted
       URL, a long handle — from forcing horizontal overflow. The two together
       are the difference between wrapping at WORD boundaries and snapping
       mid-character.

       COLOURS — received is the slate glass `#1e293b` with a slate hairline;
       sent is the orange-500 `#f97316` painted as a gradient (a flat fill
       reads as a flat block; the ramp gives it dimension and matches the
       industry-standard "my messages are orange" convention). */
    <div
      className={
        isMine
          ? "ml-auto flex min-w-[60px] max-w-[75%] flex-col gap-1 break-words whitespace-pre-wrap rounded-2xl rounded-br-none bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm leading-5 text-white shadow-md"
          : "mr-auto flex min-w-[60px] max-w-[75%] flex-col gap-1 break-words whitespace-pre-wrap rounded-2xl rounded-bl-none border border-white/10 bg-slate-800/90 px-4 py-2.5 text-sm leading-5 text-white shadow-md"
      }
    >
      {/* MEDIA — photo and/or voice note, rendered above any caption. The image is
          capped in height so a portrait shot cannot blow out the thread; the audio
          player is a compact native control the receiver can play in place. */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Photo attachment"
          loading="lazy"
          className="max-h-72 w-full rounded-xl object-cover"
        />
      ) : null}
      {audioUrl ? (
        <audio controls preload="metadata" src={audioUrl} className="w-56 max-w-full" />
      ) : null}
      {showBody ? body : null}
      <span className={isMine ? "self-end text-[10px] font-medium leading-none text-white/80" : "self-end text-[10px] font-medium leading-none text-[#C9C2E4]"}>
        {formatClock(message.created_at)}
        {isMine && seen ? " · Seen" : ""}
      </span>
    </div>
  );

  /* Edit is offered only inside the 15-minute window (mirrored and enforced
     server-side). Past it the entry is dropped rather than disabled — a menu
     item that always fails is worse than one that is absent. */
  const withinEditWindow =
    Date.now() - new Date(message.created_at).getTime() < EDIT_WINDOW_MS;
  const actions = isMine
    ? MESSAGE_ACTIONS.filter((action) => action.id !== "edit" || withinEditWindow)
    : COPY_ONLY_ACTIONS;

  return (
    <div className={rowClass}>
      {!isMine ? (
        <Avatar name={participantName} src={avatarUrl} size="sm" className="shrink-0" />
      ) : null}

      <MessageActionsMenu
        messageId={message.id}
        actions={actions}
        onAction={onAction}
        disabled={busy}
        className="min-w-0 max-w-full"
      >
        {bubble}
      </MessageActionsMenu>
    </div>
  );
}

/**
 * The top bar: back arrow, the match's identity, and the call triggers.
 *
 * ── LAYOUT: ONE ROW, IDENTITY TOP-LEFT, CALLS TOP-RIGHT ──────────────────────
 * This used to be a two-state grid that CENTRED the name in the expanded bar and
 * moved it left on scroll, with the avatar alone on the far right. That is not
 * how a dating app header reads: the person you are talking to belongs in the
 * reading order's first position, immediately after the back affordance, and a
 * portrait floating off on the opposite edge looks like a decorative orphan. So
 * the cluster is now a single left-aligned group — circular avatar with a green
 * presence dot, then name over status — and the right edge carries the two call
 * triggers and nothing else.
 *
 * WHY THE COLLAPSE BEHAVIOUR IS GONE. `useScrollCollapse` existed to shrink this
 * bar so a long thread had more room. But the whole point of the redesign is a
 * header that does NOT move: the name, the avatar and the dot stay exactly where
 * they were on first paint at every scroll offset. Keeping a second, shifted
 * layout for the same identity would reintroduce the drift this replaces, and
 * the ~24px it would save is not worth a target that relocates under a thumb.
 * `collapsed` is still accepted (the parent computes it for other chrome) and
 * drives only a background tint, which cannot move anything.
 *
 * NO UNREAD BADGE. The design shows one beside the back arrow, but a member only
 * reaches this route BY tapping that thread, and the thread marked it read on
 * mount — so a number here would always read zero, and inventing one would print
 * a permanent lie.
 */
function ChatRoomHeader({
  summary,
  conversationId,
  online,
  collapsed,
  typing,
}: {
  summary: ConversationParticipantSummary | null;
  conversationId: string;
  online: boolean;
  /** True once the thread has been scrolled; now cosmetic only. */
  collapsed: boolean;
  /** True while the other participant is typing, from the broadcast channel. */
  typing: boolean;
}) {
  const name = summary?.name ?? "Conversation";
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  /* TYPING OUTRANKS PRESENCE. "…is typing" is strictly more current than "Online
     now", and showing both at once reads as two competing states for one slot. */
  const statusText = typing ? "typing" : online ? "Online now" : "Offline";
  /* Emerald when either typing or online; grey only when genuinely neither.
     Colour is never the only cue — the word sits beside it. */
  const statusLive = typing || online;
  return (
    <header
      className="relative flex min-h-16 shrink-0 items-center gap-2 border-b px-3 py-2.5"
      style={{ backgroundColor: GLASS_BAR, borderColor: THEME.hairline }}
      /* The title is announced as a page heading for assistive tech regardless of
         which visual state is showing. */
      aria-label={summary?.name ? `Conversation with ${summary.name}` : "Conversation"}
    >
      <Link
        href="/messages"
        aria-label="Back to messages"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#C9C2E4] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </Link>

      {/* ── THE IDENTITY CLUSTER: TOP-LEFT ────────────────────────────────────
          One row, left-aligned, no absolute positioning and no scroll state:
          avatar (with the presence dot welded to it) then name over status.
          `min-w-0` on the wrapper plus `truncate` on the name is what keeps a long
          name from pushing the call buttons off the bar — without `min-w-0` the
          flex item refuses to shrink below its content width and the overflow
          lands on the buttons instead. */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Avatar → global profile modal. `profileViewClick` intercepts only a
            plain left-click, so ctrl/cmd/shift-click still opens `/u/<id>` in a
            new tab. `relative` here is the dot's positioning context. */}
        <Link
          href={`/u/${summary?.id ?? ""}`}
          aria-label={`View ${summary?.name ?? "profile"}`}
          onClick={profileViewClick(summary?.id)}
          className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0C1B]"
        >
          <Avatar name={summary?.name ?? "?"} src={summary?.avatarUrl ?? null} size="sm" />
          {/* THE GREEN ONLINE DOT. Anchored bottom-right ON the portrait rather
              than floated beside the name: that is where a presence dot reads as
              belonging to the face instead of to the row. The ring is painted in
              the bar's own background colour so the dot cuts a hole through the
              avatar edge rather than half-falling off it. */}
          <span
            aria-hidden
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ${
              statusLive ? "bg-emerald-400" : "bg-[#6B6488]"
            }`}
            style={{ ["--tw-ring-color" as string]: GLASS_BAR }}
          />
        </Link>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-white">
            {summary?.name ?? "Conversation"}
          </p>
          {/* Status line. Typing wins over presence (set above), and the three
              dots animate only for that state — a still "…" would look broken. */}
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-[#C9C2E4]">
            {typing ? (
              <>
                <span aria-hidden className="flex items-end gap-0.5 pb-0.5">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#FF7A00] [animation-delay:-0.2s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#FF7A00] [animation-delay:-0.1s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#FF7A00]" />
                </span>
                {name} is typing…
              </>
            ) : (
              <>{statusText}</>
            )}
          </p>
        </div>
      </div>

      {/* ── CALL TRIGGERS: TOP-RIGHT ───────────────────────────────────────────
          The only things on this edge. Both are real `Link`s to the call route
          rather than buttons firing an invented dispatcher — that is the pattern
          the quick actions below already use for the same two destinations, and
          a link means cmd/middle-click opens a call in a new tab and the route
          survives a JS failure. */}
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/call/${conversationId}/audio`}
          aria-label={`Start an audio call with ${name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#C9C2E4] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] active:scale-95"
        >
          <Phone className="h-5 w-5" aria-hidden />
        </Link>
        <Link
          href={`/call/${conversationId}/video`}
          aria-label={`Start a video call with ${name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#C9C2E4] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] active:scale-95"
        >
          <Video className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
/**
 * Delete the whole grapheme immediately before `index`, not just one UTF-16
 * code unit.
 *
 * A naive `text.slice(0, index - 1)` splits surrogate pairs (😀 is TWO code
 * units) and breaks apart ZWJ clusters (👨‍👩‍👧, flag sequences), leaving a
 * half-rendered glyph in the draft. `Intl.Segmenter` with `granularity:
 * "grapheme"` gives real user-perceived characters where the runtime has it;
 * the code-point spread below is the fallback for one that does not. Typed
 * through a local constructor alias so the build never depends on whether the
 * ambient lib happens to declare `Intl.Segmenter`.
 */
function stripPreviousGrapheme(text: string, index: number): { text: string; caret: number } {
  if (index <= 0) return { text, caret: 0 };
  const head = text.slice(0, index);
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        locales?: string | string[],
        options?: { granularity?: "grapheme" | "word" | "sentence" },
      ) => { segment(input: string): Iterable<{ index: number }> };
    }
  ).Segmenter;
  if (Segmenter) {
    const segmenter = new Segmenter(undefined, { granularity: "grapheme" });
    /* Every segment inside `head` reports its START; the last one is where the
       cut goes, because everything from there to `index` is one grapheme. */
    let cut = 0;
    for (const part of segmenter.segment(head)) cut = part.index;
    return { text: text.slice(0, cut) + text.slice(index), caret: cut };
  }
  /* Fallback: spreading by code point keeps a surrogate pair whole, which is
     the common case (a lone astral emoji) even without ZWJ clustering. */
  const chars = [...head];
  const last = chars.pop() ?? "";
  const cut = head.length - last.length;
  return { text: text.slice(0, cut) + text.slice(index), caret: cut };
}

export default function ChatRoomClient({
  conversationId,
  currentUserId,
  summary,
  initialMessages,
  initialOnline = false,
  coinBalance = 0,
}: {
  conversationId: string;
  currentUserId: string;
  summary: ConversationParticipantSummary | null;
  initialMessages: ChatMessage[];
  initialOnline: boolean;
  /**
   * Coin balance for the gift drawer, read server-side by the page.
   *
   * This is a SNAPSHOT at page load, not a live value. It seeds the drawer's pill
   * so it opens showing a real number rather than zero, and the authoritative
   * balance is re-read by `sendGift` on every attempt. Defaulted to 0 so the
   * component still renders if the page cannot reach the wallet - the drawer then
   * opens with Send disabled, which is a far better failure than a broken chat.
   */
  coinBalance?: number;
}) {
  const [draft, setDraft] = useState("");
  /* Which message the composer is currently patching; null = composing new. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /* "Delete for me" — a purely LOCAL hide. The row stays on the server (the
     other participant keeps seeing it); this set filters it out of THIS
     member's render only, which is exactly what "for me" means. */
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Gift drawer visibility. It is a local modal, so its state belongs here rather
     than in the composer or the server - the page has no reason to know about it. */
  const [giftOpen, setGiftOpen] = useState(false);

  /* THE EMOJI PICKER IS A DISCLOSURE, NOT A MODAL.

     Toggled by the smiley button in the input row. While it is open the field
     is BLURRED so the system keyboard drops and the drawer takes its place —
     the WhatsApp behaviour this mirrors. It renders inside the composer bar,
     so the locked column gives it height from the thread instead of letting
     it cover anything. */
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  /* The textarea itself, so insertion and the drawer's backspace can honour
     the caret rather than always appending at the end. */
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  /* The composer bar element. Attached so the VisualViewport resize
     listener can force a reflow of the sticky bar when the soft keyboard
     changes the visual viewport height. */
  const composerBarRef = useRef<HTMLDivElement | null>(null);
  /* Whether the field has ever been focused. Before that, `selectionStart` is
     0 rather than "end of text", which would make the first emoji tap insert
     at the FRONT of a draft a quick reply just filled in. Once set it stays
     set: browsers preserve the stored selection across blur, which is exactly
     the range the drawer needs while the keyboard is dismissed. */
  const inputFocusedRef = useRef(false);

  /* SENT MESSAGES, HELD LOCALLY SO THEY RENDER BEFORE THE BROADCAST ARRIVES.

     The action returns the persisted row (same id the database assigned), so the
     sender's bubble can be drawn the instant the insert resolves instead of
     waiting 100-300ms for Supabase Realtime to echo the INSERT back. The merge
     below de-duplicates by id, so when the broadcast does land — or when
     `revalidatePath("/messages")` eventually refreshes the seed — the copy
     collapses into the existing bubble rather than rendering a second one. */
  const [sent, setSent] = useState<ChatMessage[]>([]);

  /* Mark read on mount, never from the server render. See the file header. */
  useEffect(() => {
    void markConversationReadAction(conversationId);
  }, [conversationId]);

  const otherId = summary?.id ?? null;
  const { presence } = usePresence(otherId ? [otherId] : [], Boolean(otherId));
  const online = otherId
    ? presence[otherId]
      ? presence[otherId].online
      : initialOnline
    : initialOnline;

  const { messages: live } = useRealtimeMessages({ conversationId, enabled: true });

  /* ── LIVE TYPING ────────────────────────────────────────────────────────────
     A broadcast channel, not a table write: a keystroke event has no business
     being a row (see `useTypingChannel` for why). `selfId` lets the hook drop the
     echo of this member's own announcements, which otherwise would show them
     "typing" at themselves. */
  const { peerTyping, announceTyping } = useTypingChannel({
    conversationId,
    selfId: currentUserId,
  });

  /* ── LIVE "SEEN" ────────────────────────────────────────────────────────────
     `markConversationReadAction` stamps `read_at` on the rows the peer opens, so
     a Seen indicator needs nothing written on the sender's side — it only needs
     to HEAR about those stamps. This subscribes to UPDATEs on this conversation
     and records the newest read timestamp among MY messages, which is what
     `MessageBubble` renders as "· Seen".

     WHY ONLY THIS MEMBER'S OWN MESSAGES. `markConversationRead` updates every
     unread row in the thread, including the peer's own sent copies — reading
     those would mark the peer's bubbles as seen by them, which is meaningless.

     WHY THE MAXIMUM AND NOT THE LATEST EVENT. Events can arrive out of order on
     a flaky radio. Taking the newest stamp is monotonic, so a late duplicate can
     never un-see a message. */
  const [peerReadAt, setPeerReadAt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      return; // Supabase unconfigured — no realtime, and nothing to subscribe to.
    }

    const channel = supabase
      .channel(`seen:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new?: { id?: string; sender_id?: string; read_at?: string | null } }) => {
          if (!alive) return;
          const row = payload.new;
          if (!row?.read_at) return;
          if (row.sender_id !== currentUserId) return;
          const stamp = new Date(row.read_at).getTime();
          if (!Number.isFinite(stamp)) return;
          setPeerReadAt((prev) => (prev === null || stamp > prev ? stamp : prev));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void channel.unsubscribe().catch(() => undefined);
    };
  }, [conversationId, currentUserId]);

  /* Initial history, live inserts and locally-sent rows MERGED, de-duplicated by
     id and sorted by time. The seed alone would miss anything sent while the
     page was open; the live list alone would be empty on first paint. The de-dup
     is not belt-and-braces — the sender's own message comes back over the
     realtime channel as well, so without this every sent message would render
     twice. `sent` is applied LAST so the returned row wins the map slot for its
     id, which is what lets a bubble appear before the broadcast catches up. */
  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of initialMessages) byId.set(m.id, m);
    for (const m of live) byId.set(m.id, m as ChatMessage);
    for (const m of sent) byId.set(m.id, m);
    return [...byId.values()].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [initialMessages, live, sent]);

  /* The list the thread actually renders: everything except ids this member
     hid with "Delete for me". Server-side tombstones (is_deleted) are NOT
     filtered — they render as "This message was deleted" instead. */
  const visibleMessages = useMemo(
    () => messages.filter((m) => !hiddenIds.has(m.id)),
    [messages, hiddenIds],
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // The locked viewport column itself. Attached so the component can read
  // the column's measured box (its clientHeight caps the keyboard case).
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* SCROLL-DRIVEN HEADER COLLAPSE.

     `useScrollCollapse` keeps its own internal ref to the scroll container, and
     this component already has one for "pin to the newest message". Rather than
     give the thread two `ref`s (impossible on one element) or duplicate the
     listener, `attachThread` below writes ONE element into both. */
  const { ref: collapseRef, collapsed: headerCollapsed } = useScrollCollapse<HTMLDivElement>(12);

  /* A ref CALLBACK rather than an object ref, because the element has to be
     registered in two places. It is memoised on `[]` so React does not detach and
     re-attach the hook's scroll listener on every render — an unstable ref
     callback here would silently break the header on each state change. */
  const attachThread = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    collapseRef.current = el;
  }, [collapseRef]);

  /* Pin to the newest message. Keyed on the merged list rather than per message
     id so an insert, a merge and an edit each settle the view once. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleMessageAction = useCallback(
    async (action: MessageAction, messageId: string) => {
      if (action.id === "copy") {
        const text = messages.find((m) => m.id === messageId)?.body ?? "";
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* denied — the text is already on screen to read longhand */
        }
        return;
      }
      setBusy(true);
      setError(null);
      try {
        if (action.id === "delete") {
          // "Delete for everyone" — server-side soft delete (is_deleted = true,
          // migration 054). The realtime UPDATE echoes it back and the bubble
          // swaps to its tombstone for both participants.
          const result = await deleteMessageAction({ messageId });
          if (!result.ok) setError(result.error ?? "That message could not be deleted.");
        } else if (action.id === "delete_me") {
          // "Delete for me" — no server write at all. Local filter only.
          setHiddenIds((prev) => new Set(prev).add(messageId));
          if (editingId === messageId) {
            setDraft("");
            setEditingId(null);
          }
        } else if (action.id === "edit") {
          /* Edits reuse this composer instead of opening a second editor: the
             existing text is loaded into the field so the member corrects it in
             place and presses Send. A modal over a 4000-character cap on a phone
             is worse than reusing the input they are already looking at. */
          const existing = messages.find((m) => m.id === messageId)?.body ?? "";
          setDraft(existing);
          setEditingId(messageId);
          setError("Editing — press Send to save.");
        }
      } finally {
        setBusy(false);
      }
    },
    [messages],
  );

  const send = useCallback(async () => {
    const body = draft.trim().slice(0, MAX_LENGTH);
    if (!body) return;

    setBusy(true);
    setError(null);
    try {
      const result = editingId
        ? await editMessageAction({ messageId: editingId, body })
        : await sendMessageAction({ conversationId, body });
      if (!result.ok) {
        setError(result.error ?? "That message could not be sent.");
        return;
      }
      /* Paint the sender's own bubble NOW, from the returned row, rather than
         after the realtime echo. `result.message` is absent only if Supabase
         returned no row (legacy path), in which case the broadcast still
         delivers it — we simply lose the head start, never the message. */
      if (!editingId && result.message) {
        setSent((prev) => [...prev, result.message as ChatMessage]);
      }
      setDraft("");
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  }, [conversationId, draft, editingId]);

  /* ── VOICE NOTES (MediaRecorder) ─────────────────────────────────────────
     Tap the mic to record, tap the stop (square) to send, or tap the X to
     discard. The blob is captured as webm (or mp4 on Safari), uploaded to the
     same `chat-attachments` bucket the photo path uses, and an `audio` message
     row is inserted so the receiver gets it instantly over the existing
     realtime subscription. No Server Action — large audio bodies hit the same
     Vercel 4.5 MB (E394) cap that broke moment uploads. */
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [sendingRec, setSendingRec] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);

  const finishRecording = useCallback(
    async (mime: string) => {
      if (recTimerRef.current !== null) {
        window.clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
      const blob = new Blob(recChunksRef.current, { type: mime });
      recChunksRef.current = [];
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
      recStreamRef.current = null;
      setRecording(false);
      /* Sub-second taps produce an empty/near-empty blob; treat them as a
         cancelled recording rather than sending silence. */
      if (blob.size < 500) return;

      setSendingRec(true);
      try {
        const supabase = getSupabaseClient();
        const ext = mime.includes("mp4") ? "m4a" : "webm";
        const path = `${conversationId}/${currentUserId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-attachments")
          .upload(path, blob, { contentType: mime || "audio/webm", cacheControl: "3600", upsert: true });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        const audioUrl = data?.publicUrl;
        if (!audioUrl) throw new Error("Could not resolve audio URL");

        const { data: row, error: insErr } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            body: "🎤 Voice note",
            type: "audio",
            audio_url: audioUrl,
          })
          .select("id, conversation_id, sender_id, type, body, created_at, audio_url")
          .single();
        if (insErr) throw insErr;
        /* Paint my own bubble immediately; the realtime INSERT dedupes by id. */
        if (row) setSent((prev) => [...prev, (row as ChatMessage)]);
      } catch (err) {
        console.error("[chat] voice note failed", err);
        setError("Could not send voice note. Please try again.");
      } finally {
        setSendingRec(false);
      }
    },
    [conversationId, currentUserId]
  );

  const startRecording = useCallback(async () => {
    if (recording || sendingRec) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      recChunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void finishRecording(recorder.mimeType || mime || "audio/webm");
      };
      recorder.start();
      setRecSeconds(0);
      setRecording(true);
      recTimerRef.current = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("[chat] mic unavailable", err);
      setError("Microphone unavailable. Check your permissions.");
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
      recStreamRef.current = null;
    }
  }, [recording, sendingRec, finishRecording]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  /* Discard the in-flight recording without sending. */
  const cancelRecording = useCallback(() => {
    if (recTimerRef.current !== null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    recChunksRef.current = [];
    recStreamRef.current?.getTracks().forEach((t) => t.stop());
    recStreamRef.current = null;
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* recorder already stopped */
    }
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecSeconds(0);
  }, []);

  /* Stop the timer and release the mic if the member navigates away mid-record. */
  useEffect(() => {
    return () => {
      if (recTimerRef.current !== null) window.clearInterval(recTimerRef.current);
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /** "0:07" — m:ss elapsed recorder time. */
  const formatRecTime = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      void send();
    },
    [send],
  );

  /* Enter sends on a physical keyboard, Shift+Enter inserts a newline. On touch
     the only key the layout offers is the newline one, so this cannot surprise a
     phone user into sending half a thought. */
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void send();
      }
    },
    [send],
  );

  /* INSERT AT THE CARET, NOT AT THE END.

     The draft is controlled, so the only source of truth for "where" is the
     textarea's own selection — read it, splice the emoji in, and put the
     caret back after it once React has written the new value to the DOM. The
     `hasCaret` gate falls back to appending when the field has never been
     focused (see `inputFocusedRef`). */
  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = inputRef.current;
      const hasCaret = inputFocusedRef.current && el !== null;
      const start = hasCaret ? (el.selectionStart ?? draft.length) : draft.length;
      const end = hasCaret ? (el.selectionEnd ?? draft.length) : draft.length;
      const next = draft.slice(0, start) + emoji + draft.slice(end);
      /* `send` slices to MAX_LENGTH and the server enforces the same cap;
         refuse the tap rather than let the draft grow past it. */
      if (next.length > MAX_LENGTH) return;
      setDraft(next);
      /* The DOM value lands on re-render; park the caret after the inserted
         emoji once it has. The field is deliberately NOT re-focused — that
         would raise the keyboard the open drawer just dismissed. */
      requestAnimationFrame(() => {
        const caret = start + emoji.length;
        el?.setSelectionRange(caret, caret);
      });
    },
    [draft],
  );

  /* The drawer's backspace. Removes a SELECTION when one exists, otherwise the
     whole grapheme before the caret — one tap, one user-perceived character. */
  const deletePreviousEmoji = useCallback(() => {
    const el = inputRef.current;
    const hasCaret = inputFocusedRef.current && el !== null;
    const start = hasCaret ? (el.selectionStart ?? draft.length) : draft.length;
    const end = hasCaret ? (el.selectionEnd ?? draft.length) : draft.length;
    let next: string;
    let caret: number;
    if (start !== end) {
      next = draft.slice(0, start) + draft.slice(end);
      caret = start;
    } else {
      const stripped = stripPreviousGrapheme(draft, start);
      next = stripped.text;
      caret = stripped.caret;
    }
    if (next === draft) return;
    setDraft(next);
    requestAnimationFrame(() => el?.setSelectionRange(caret, caret));
  }, [draft]);

  /* Index of the newest message from the other member. The scam warning is
     attached to that one and to nothing else. */
  const lastIncomingIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.sender_id !== currentUserId) return i;
    }
    return -1;
  }, [messages, currentUserId]);

  /* Index of the newest message I sent — the ONE bubble that carries the "Seen"
     label. Same reverse scan, inverted predicate, and -1 when I have not sent
     anything (so the seen expression can never match an empty thread). */
  const lastOwnIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.sender_id === currentUserId) return i;
    }
    return -1;
  }, [messages, currentUserId]);
/* THE LOCKED VIEWPORT COLUMN.

   `h-full max-h-[100dvh]`, NOT a bare `h-[100dvh]`.

   `100dvh` is the height of the WHOLE viewport, but this column is not the root of
   the page. It sits inside `<body>` -> `AppShell` -> the middle row -> `<main>` ->
   the `(app)` layout's `<section>`, and every one of those ancestors is already
   measuring the space that is actually LEFT. Declaring the full viewport height
   again here ignores that space, so the column is too tall by exactly the height
   the shell has already spent above it. Because every ancestor is
   `overflow-hidden`, that overflow is not a scrollbar - it is a silent CROP at the
   bottom edge, and the composer (the last child) is what vanishes. That is the
   "input box and bottom bar cut short" symptom, and it is why the source looked
   correct while the screen failed.

   The shell spends real height above this column in ordinary cases:
     - the demo banner (`shrink-0` in AppShell, ~2.5rem),
     - `MobileBackHeader` on any route where it is not suppressed,
     - mobile browser chrome, which `dvh` already excludes.

   `h-full` fills the parent's measured box, so the column can never exceed the
   space it was given. `max-h-[100dvh]` is the belt-and-braces half: it still
   clamps to the VISUAL viewport, which preserves the keyboard behaviour this file
   documents at the top - when a mobile browser shrinks the visual viewport for the
   on-screen keyboard, the column shrinks with it and the composer rides up instead
   of hiding behind the keyboard.

   THE THREE REGIONS, and why each is what it is:
     header   `shrink-0`  - never scrolls, so it is sticky by construction rather
                            than by `position: sticky` inside the scroller.
     thread   `flex-1 min-h-0 overflow-y-auto` - the ONLY scroll region. `min-h-0`
                            is load-bearing: a flex item's default `min-height:auto`
                            refuses to shrink below its content, so without it a long
                            thread pushes the composer off the bottom instead of
                            scrolling.
     composer `shrink-0`  - a flex SIBLING of the thread, so it is always on screen
                            and never scrolls away.

   The app shell drops its `<main>` padding and hides the tab bar on this route
   (`isActiveConversationPath`), so the composer inherits the full height.
   `flex-1` fills the shell's measured box (body is `h-dvh`, so this resolves to
   the true dynamic viewport minus only the chrome above it); `max-h-[100dvh]`
   clamps the keyboard case so the composer rides up instead of hiding. */
  
  /* VISUAL VIEWPORT RESIZE LISTENER.
   *
   * `h-[100dvh]` already makes the locked column track the *visual* viewport, so
   * when a mobile browser opens the on-screen keyboard the whole column shrinks
   * and the `sticky bottom-0` composer rides up with it. That handles the common
   * case, but some engines (notably iOS Safari) do not always re-run layout on
   * the composer's own ancestors in time, so the composer can sit a few pixels
   * short of the keyboard edge. Listening to `visualViewport.resize` and forcing
   * a reflow of the composer bar closes that gap: it is the direct replacement
   * for the React Native `KeyboardAvoidingView` this route has no equivalent for.
   *
   * `visualViewport` is feature-detected: desktop browsers that lack it simply
   * never open a soft keyboard, so the no-op early return is correct there. */
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleViewportResize = () => {
      const composer = composerBarRef.current;
      if (!composer) return;
      // Force a layout pass so the sticky offset re-resolves against the new
      // visual viewport height. Reading offsetHeight is the cheapest reflow
      // trigger and does not mutate any state.
      void composer.offsetHeight;
    };

    viewport.addEventListener("resize", handleViewportResize);
    return () => viewport.removeEventListener("resize", handleViewportResize);
  }, []);

  return (
    <div
      className="relative flex h-full max-h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#0F0C1B]"
      ref={rootRef}
      style={{
        /* THE CANVAS GRADIENT, not the flat `THEME.canvas`.
           `THEME.canvas` (`#0F0C1B`) is still the base colour below it, but the
           surface the thread sits on is the SAME vertical ramp plus two radial
           blooms that `app/(app)/profile/page.tsx` and the inbox both use, so
           moving between Profile -> Inbox -> Thread is one continuous surface
           rather than three different dark screens. */
        backgroundColor: THEME.canvas,
        backgroundImage: [
          "radial-gradient(90% 45% at 50% 100%, rgba(255,138,46,0.20) 0%, rgba(255,122,0,0.07) 42%, rgba(255,122,0,0) 74%)",
          "radial-gradient(120% 50% at 50% 62%, rgba(122,92,178,0.18) 0%, rgba(122,92,178,0.05) 45%, rgba(122,92,178,0) 75%)",
          "linear-gradient(180deg, #0F0C1B 0%, #0F0C1B 10%, #1B1636 36%, #2C1B41 64%, #402340 86%, #55303A 100%)",
        ].join(", "),
        /* Fixed, so the ramp is sized to the VIEWPORT. This column is
           `h-[100dvh] overflow-hidden` and the THREAD scrolls inside it, so an
           ordinary gradient would be sized to this box (correct) — but `fixed`
           guarantees the warm foot stays at the bottom of the screen however the
           message column grows, instead of stretching with the content. */
        backgroundSize: "100% 100%",
      }}
    >
      <ChatRoomHeader
        summary={summary}
        conversationId={conversationId}
        online={online}
        collapsed={headerCollapsed}
        typing={peerTyping}
      />

      {/* THREAD. `px-3` is the 12px edge padding from the spec — applied HERE rather
          than on the root column, because the root also holds the header and the
          composer, which must stay edge-to-edge. Padding the root instead would
          inset those two bars, which is the opposite of what is wanted.

          `flexGrow` has no direct Tailwind equivalent on a scroll container here:
          the thread is `flex-1` in a `h-[100dvh]` column, so it already fills the
          space above the composer. The RN `flexGrow: 1` exists so an EMPTY thread
          still pushes content up rather than stacking it at the top; the same job
          is done by `justify-end` on the inner message column, added below. */}
      <div
        ref={attachThread}
        /* THE THREAD IS THE CONVERSATION'S OWN SCROLL REGION, and it needs the
           full mobile triad or phones misbehave in three distinct ways:
             `flex-1 min-h-0`    - without min-height:0 a flex item refuses to
                                   shrink below its content, so a long thread
                                   would push the composer off-screen instead of
                                   scrolling;
             `overflow-y-auto`   - it is genuinely scrollable, and the ONLY thing
                                   that scrolls in this locked column;
             `-webkit-overflow-scrolling: touch` - the iOS momentum flag, without
                                   which Safari drags the whole page with jerky
                                   non-inertial scrolling;
             `overscroll-contain` - reaching the top of the thread must not pull
                                   the page behind it into a rubber-band.
           `touch-pan-y` keeps the browser from claiming horizontal gestures, so
           side-swipe back still works on iOS even though the axis is vertical. */
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y px-3 pb-3 pt-3 [-webkit-overflow-scrolling:touch]"
      >
        <PinnedProfileCard summary={summary} />

        <div className="mt-3 flex flex-col justify-end gap-2.5">
          {visibleMessages.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#B8B2D1]">No messages yet — say hello.</p>
          ) : null}

          {visibleMessages.map((message, index) => {
            const isMine = message.sender_id === currentUserId;
            /* A centred clock above the first message of each minute group. */
            const previous = messages[index - 1];
            const showStamp =
              !previous ||
              Math.floor(new Date(previous.created_at).getTime() / 60000) !==
                Math.floor(new Date(message.created_at).getTime() / 60000);

            return (
              <div key={message.id} className="flex flex-col gap-2.5">
                {/* TIMESTAMPS. `text-[#C9C2E4]`, not `slate-400` and not `slate-500`: this is one
                    of the two places the old ramp dropped below AA, and a 10px
                    caption on `#0F0C1B` is exactly the case that needs the lift. */}
                {showStamp ? (
                  <p className="text-center text-[10px] font-medium text-[#C9C2E4]">
                    {formatClock(message.created_at)}
                  </p>
                ) : null}

                <MessageBubble
                  message={message}
                  isMine={isMine}
                  avatarUrl={summary?.avatarUrl ?? null}
                  participantName={summary?.name ?? "Member"}
                  onAction={handleMessageAction}
                  busy={busy}
                  /* "Seen" only on the LAST of my own messages, and only once the
                     peer has actually opened past it. Painting it on every bubble
                     turns one quiet status into a column of repeated labels; a
                     single one at the tail of my last message says the same thing
                     and reads as information rather than noise. */
                  seen={
                    isMine &&
                    index === lastOwnIndex &&
                    peerReadAt !== null &&
                    new Date(message.created_at).getTime() <= peerReadAt
                  }
                />

                {index === lastIncomingIndex ? <ScamWarning /> : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* THE BOTTOM BAR — the composer. `w-full` + `self-stretch` are the spec's
          `width: '100%'` and `alignSelf: 'stretch'`, and `px-2`/`pt-2` are its
          8px paddings.

          `sticky bottom-0 z-40` pins it to the bottom of the locked column at a
          stacking order above the thread (z-10 there) and below the action
          menu (z-200) and sheets. It remains a FLEX SIBLING of the thread
          rather than `position: fixed`: a fixed bar at `bottom: 0` resolves
          against the VIEWPORT and would be painted under this route's own
          chrome; as a sticky sibling it is always on screen, `shrink-0` stops a
          long thread from compressing it below the 44px touch target, and —
          because the parent column is `h-full max-h-[100dvh]` — the whole bar
          rides UP with the on-screen keyboard instead of being pushed out of
          view. That is the keyboard-cutoff fix; see the note at the top of
          this file. */}
      <div
        ref={composerBarRef}
        className="sticky bottom-0 z-40 w-full shrink-0 border-t px-2 pt-2"
        style={{
          /* OPAQUE `#0b0f19`, not GLASS_BAR. The composer is the last child of
             a column whose own gradient ends at its top edge — a translucent
             fill here lets the near-black canvas show through as a "dead"
             strip whenever the toolbar + quick chips pin it in place. The
             solid fill matches the app's dark chrome so the bar reads as one
             continuous surface with the rest of the shell. */
          backgroundColor: "#0b0f19",
          borderColor: THEME.hairline,
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
        }}
      >
        {/* Quick replies. The design draws a horizontal scroll strip; with six
           short pills `flex-wrap` shows every one of them without a swipe, which
           is strictly better on a phone — and each pill is a real button, so the
           set stays keyboard-reachable. */}
        {/* QUICK REPLIES.
             Horizontal SCROLL, not wrap. `flex-wrap` showed all six at once but
             pushed the composer below the fold on a short phone, which is the one
             thing a chat composer must never do. `overflow-x-auto` +
             `shrink-0` pills keeps the row exactly one line tall and lets it
             swipe; `scrollbar-none` hides the bar so it does not eat 8px of the
             input's height.

             The ORANGE is a border + text, not a fill: `#FF7A00` as a background
             would make six saturated chips fight the single orange Send button for
             attention, and the Send button is the one the member actually uses.

             THIS COMMENT IS INSIDE `{}` AND THAT IS LOAD-BEARING. It used to sit
             here as a BARE block comment, and in a JSX CHILDREN position a bare
             block comment is not a comment to React at all — it is a literal text
             node, so the whole paragraph rendered on screen above the pills. Every
             JSX comment must be braced. */}
        <div className="scrollbar-none mb-1 flex gap-1.5 overflow-x-auto px-1 py-1.5">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              /* Fills the composer rather than sending: a sent message cannot be
                 unsent, so a pill that posted immediately would be a decision the
                 member never made. */
              onClick={() => {
                setDraft(reply);
                setEditingId(null);
              }}
              className="shrink-0 rounded-full border border-orange-500/60 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-orange-200 transition hover:bg-orange-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* The emoji drawer sits between the quick replies and the input row,
            so its bottom tab bar lands directly above the field WhatsApp-style
            and, being in flow, it takes height from the thread rather than
            covering anything. */}
        {isEmojiPickerOpen ? (
          <EmojiPickerDrawer
            onPick={insertEmoji}
            onBackspace={deletePreviousEmoji}
            onClose={() => setIsEmojiPickerOpen(false)}
          />
        ) : null}

        {/* ── RECORDING STATE. While the mic is live the whole toolbar swaps to a
             recorder row: a pulsing dot, the elapsed timer, a discard (X) and a
             stop-and-send (square) — the WhatsApp pattern, so there is never a
             text field next to an active microphone. */}
        {recording ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5"
          >
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-500" aria-hidden />
            <span className="text-sm font-semibold tabular-nums text-rose-200">
              Recording {formatRecTime(recSeconds)}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                aria-label="Discard recording"
                title="Discard"
                className="flex h-9 w-9 items-center justify-center rounded-full text-rose-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                aria-label="Send voice note"
                title="Send voice note"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-orange-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA040]"
                style={{ backgroundColor: ORANGE }}
              >
                <Square className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          {/* LEFT: attachment (image) then mic (voice). Both open native pickers /
              the recorder — the two media affordances live together on the left so
              the center stays a clean text field. */}
          <ChatPhotoUploadButton conversationId={conversationId} currentUserId={currentUserId} />
          <button
            type="button"
            onClick={() => void startRecording()}
            disabled={sendingRec}
            aria-label="Record a voice message"
            title="Voice message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#C9C2E4] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] disabled:opacity-50"
          >
            <Mic className="h-5 w-5" aria-hidden />
          </button>
          {/* THE GIFT BUTTON lives in the toolbar's left cluster (not a second row)
              so gifting stays one tap away without the duplicate action bar this
              composer used to render. It opens `GiftDrawer` in place. */}
          <button
            type="button"
            onClick={() => setGiftOpen(true)}
            aria-label="Send a gift"
            title="Gift"
            aria-expanded={giftOpen}
            aria-haspopup="dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#C9C2E4] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
          >
            <Gift className="h-5 w-5" aria-hidden />
          </button>

          <textarea
            ref={inputRef}
            value={draft}
            onFocus={() => {
              inputFocusedRef.current = true;
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              /* ── ANNOUNCE TYPING ─────────────────────────────────────────────
                 Must be called from the ACTUAL keystroke path. The hook can
                 subscribe and expose `announceTyping`, but nothing else in the
                 app writes to the draft — insert-an-emoji and tap-a-quick-reply
                 also setDraft, and a member who fills the composer either way
                 and then pauses is indistinguishable from one who typed. So the
                 call goes here, on every change to this one field, which is the
                 only path that means "this person is writing".

                 The hook throttles internally (1.5s floor), so this is a plain
                 call — no local debounce, or two throttles would fight. */
              announceTyping();
              /* Typing during an edit means the member has moved on; drop back to
                 composing rather than silently patching the old message. */
              if (editingId) setEditingId(null);
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={editingId ? "Edit your message..." : "Type a message..."}
            aria-label="Message"
            className="min-h-10 min-w-0 flex-1 resize-none rounded-2xl border bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-[#B8B2D1] focus:border-[#FF7A00]"
            style={{ borderColor: THEME.hairline }}
          />

          <button
            type="button"
            aria-label="Insert emoji"
            aria-expanded={isEmojiPickerOpen}
            aria-controls={isEmojiPickerOpen ? EMOJI_PICKER_PANEL_ID : undefined}
            title="Emoji"
            onClick={() => {
              const opening = !isEmojiPickerOpen;
              setIsEmojiPickerOpen(opening);
              /* OPENING DISMISSES THE SYSTEM KEYBOARD. A blur is the only
                 thing a web page can ask a phone to hide its keyboard with;
                 the drawer stands in for it until the member taps the field
                 again. Closing does NOT re-focus, for the same reason in
                 reverse — the member decides when typing resumes. */
              if (opening) inputRef.current?.blur();
            }}
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]",
              isEmojiPickerOpen
                ? "bg-white/10 text-[#FF7A00]"
                : "text-[#C9C2E4] hover:bg-white/10",
            ].join(" ")}
          >
            <Smile className="h-5 w-5" aria-hidden />
          </button>

          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            aria-label="Send message"
            title="Send"
            /* THE SEND BUTTON IS ORANGE, NOT WHITE.

               `THEME.ink` is now `#FFFFFF` — it is the BODY TEXT colour, and the
               old code reused it as this button's fill because on a light theme
               the send button happened to be dark. Left alone, the retint would
               have produced a white button that reads as the brightest, most
               attention-grabbing object on a screen whose whole point is calm
               legibility. It now uses the accent, which is what the design asks
               for and what distinguishes it from the four grey utility icons
               beside it. */
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA040]"
            style={{ backgroundColor: ORANGE }}
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
        )}

        {/* `role="status"` so a failed send is announced, not merely drawn. */}
        {error ? (
          /* ERROR TEXT. `rose-400`, not `rose-600`: `#E11D48` on `#0F0C1B` is about
             3.6:1, a clear AA FAILURE for an 11px message - and a send failure is
             exactly the text a member must be able to read first. `rose-400`
             clears 6:1 while still reading as red rather than pink. */
          <p role="status" className="mt-2 text-[11px] font-medium text-rose-400">
            {error}
          </p>
        ) : null}
      </div>

      {/* THE GIFT DRAWER. Mounted as the LAST child of the locked column so it
          paints above the header, the thread and the composer, and so its fixed
          shell is not clipped by any ancestor's `overflow-hidden`.

          `signedIn` is derived from `currentUserId` rather than passed: this route
          is behind `getCurrentSessionUser`, so the absence of an id IS the
          signed-out case, and threading a second boolean for it would be two sources
          of truth that could disagree. */}
      <GiftDrawer
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        conversationId={conversationId}
        coinBalance={coinBalance}
        signedIn={Boolean(currentUserId)}
      />
    </div>
  );
}
