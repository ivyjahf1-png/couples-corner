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
  Image as ImageIcon,
  MapPin,
  Mic,
  Phone,
  Send,
  ShieldAlert,
  Smile,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/app/Avatar";
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
   * Own (right-hand) bubbles. `#F2670C` is the vibrant orange from the app ramp
   * — enough separation to tell who is speaking at a glance, while staying close
   * enough in lightness that the thread does not read as two disconnected halves.
   */
  own: "#F2670C",
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

/** One message as it arrives from the server or from realtime. */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string | null;
  created_at: string;
  edited_at?: string | null;
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
}: {
  message: ChatMessage;
  isMine: boolean;
  avatarUrl: string | null;
  participantName: string;
  onAction: (action: MessageAction, messageId: string) => void;
  busy: boolean;
}) {
  const body = (message.body ?? "").trim();
  if (!body) return null;

  const bubble = (
    /* THE BUBBLE.

       `max-w-[80%]` is the spec's 80% cap, and `ml-1`/`mr-1` is its 4px lap
       toward the thread edge. The lap is what stops an incoming bubble sitting
       flush against the scroll container's padding and reading as clipped, and
       what keeps an outgoing one off the right bezel.

       `w-fit` is required alongside `max-w`: without it a block-level div fills
       the row and the cap has nothing to shrink, so every bubble would render as a
       full-width slab regardless of its text. `w-fit` makes the box shrink to the
       content first, and `max-w` then only bites on genuinely long messages.

       `break-words` stops one unbroken token (a pasted URL, a long handle) from
       forcing horizontal overflow on a narrow phone. */
    <div
      className={`flex w-fit max-w-[80%] flex-col gap-1 break-words rounded-2xl px-3 pb-1.5 pt-2 text-sm leading-5 ${
        isMine ? "mr-1" : "ml-1"
      }`}
      style={{
        backgroundColor: isMine ? THEME.own : "rgba(255, 255, 255, 0.08)",
        border: isMine ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
        color: THEME.ink,
        /* Tail pointing at the avatar: squared off on the corner nearest the
           sender, so incoming and outgoing read as two sides of one thread. */
        borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      }}
    >
      <p className="whitespace-pre-wrap break-words text-sm leading-5">{body}</p>
      <span className={isMine ? "self-end text-[10px] font-medium leading-none text-white/80" : "self-end text-[10px] font-medium leading-none text-[#C9C2E4]"}>{formatClock(message.created_at)}</span>
    </div>
  );

  return (
    <div className={`flex w-full items-end gap-2 ${isMine ? "flex-row-reverse justify-start pl-10" : "flex-row justify-start pr-10"}`}>
      {!isMine ? (
        <Avatar name={participantName} src={avatarUrl} size="sm" className="shrink-0" />
      ) : null}

      <MessageActionsMenu
        messageId={message.id}
        actions={isMine ? MESSAGE_ACTIONS : COPY_ONLY_ACTIONS}
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
 * The top bar: back arrow, identity, presence, avatar thumbnail.
 *
 * NO UNREAD BADGE. The design shows one beside the back arrow, but a member only
 * reaches this route BY tapping that thread, and `ConversationClient` marked the
 * conversation read on mount — so a number here would always read zero. There is
 * no unread-for-this-conversation figure in `ConversationParticipantSummary` to
 * source it from, and inventing one would print a permanent lie.
 */
function ChatRoomHeader({
  summary,
  online,
  collapsed,
}: {
  summary: ConversationParticipantSummary | null;
  online: boolean;
  /** True once the thread has been scrolled past the collapse threshold. */
  collapsed: boolean;
}) {
  /* The two states are laid out as a GRID with the same number of rows and the
     same explicit row heights, and only the CONTENT differs. Animating a height
     between two genuinely different layouts (avatar+name+status vs a single line)
     is not possible without measuring, and measuring on every scroll frame is
     exactly the jank this feature must not introduce. So instead the bar keeps a
     constant height and swaps what occupies it:

       expanded  - a taller row holding avatar + name + status
       collapsed - a single line: back arrow, name only, avatar

     Both states render the SAME title text, so the name never disappears and
     never jumps: it is centred in the expanded bar and sits left-aligned next to
     the back arrow in the collapsed one, which is the "pins cleanly to the
     top-left" behaviour that was asked for.

     `min-h-16` is set on both, so collapsing changes what is visible rather than
     how tall the bar is - no reflow of the thread below, no scroll-position jump. */
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

      {/* EXPANDED: centred identity with the presence line under the name.

          PINNED TO THE HEADER'S CENTRE LINE, NOT TO THE LEFT FLEX SLOT. This block
          used to be `min-w-0 flex-1 text-center`, and the bar also renders a
          collapsed block that takes a second `flex-1` — so the name centred inside
          the LEFT HALF of the bar, not the bar itself, and shifted whenever the
          back button or avatar changed width. Absolute centring measures it from
          the header alone, so the title stays dead-centre at every width and
          cannot drift during scroll. `max-w` + `truncate` keeps a long name off
          the back button and avatar. */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 w-full max-w-[55%] -translate-x-1/2 -translate-y-1/2 text-center transition-opacity duration-150 ${
          collapsed ? "opacity-0" : "opacity-100"
        }`}
        /* Removed from the accessibility tree when collapsed, because the same
           name is rendered by the compact row below and a screen reader would
           otherwise announce the title twice. */
        aria-hidden={collapsed}
      >
        <p className="flex items-center justify-center gap-1 truncate text-sm font-bold text-white">
          <span className="truncate">{summary?.name ?? "Conversation"}</span>
        </p>
        <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-medium text-[#C9C2E4]">
          {/* Colour alone is not the only cue — the word is right there, so the
              state does not depend on distinguishing two greens. */}
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-[#B8B2D1]"}`}
          />
          {online ? "Online" : "Offline"}
        </p>
      </div>

      {/* COLLAPSED: the name pinned to the top-left, beside the back arrow.
          It occupies the same flex slot as the block above, so the avatar on the
          right never moves and nothing reflows. */}
      <div
        className={`min-w-0 flex-1 transition-opacity duration-150 ${
          collapsed ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!collapsed}
      >
        <p className="truncate text-sm font-bold text-white">
          {summary?.name ?? "Conversation"}
        </p>
      </div>

      {/* THE AVATAR OPENS THE GLOBAL PROFILE MODAL. `profileViewClick` prevents
          the default navigation and dispatches the open event instead — the
          `/u/<id>` href stays as the no-JS/auxiliary-click fallback, and
          ctrl/cmd/shift-click still opens it in a new tab (the helper only
          intercepts plain left-clicks). */}
      <Link
        href={`/u/${summary?.id ?? ""}`}
        aria-label={`View ${summary?.name ?? "profile"}`}
        onClick={profileViewClick(summary?.id)}
        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0C1B]"
      >
        <Avatar name={summary?.name ?? "?"} src={summary?.avatarUrl ?? null} size="sm" />
      </Link>
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

  const scrollRef = useRef<HTMLDivElement | null>(null);

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
          const result = await deleteMessageAction({ messageId });
          if (!result.ok) setError(result.error ?? "That message could not be deleted.");
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

  /* Gift is NOT in this list any more: it opens `GiftDrawer` in place rather than
     navigating to `/store`. A member sending a gift to the person they are
     talking to should not lose the conversation to get there, so it is rendered
     separately below as a button. */
  const quickActions: { label: string; href: string; icon: LucideIcon; isNew?: boolean }[] = [
    { label: "Gallery", href: "/profile", icon: ImageIcon },
    { label: "Call", href: `/call/${conversationId}/audio`, icon: Phone },
    { label: "Video", href: `/call/${conversationId}/video`, icon: Video, isNew: true },
  ];

  /* Index of the newest message from the other member. The scam warning is
     attached to that one and to nothing else. */
  const lastIncomingIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.sender_id !== currentUserId) return i;
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
  return (
    <div
      className="relative flex h-full max-h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#0F0C1B]"
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
      <ChatRoomHeader summary={summary} online={online} collapsed={headerCollapsed} />

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
          {messages.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#B8B2D1]">No messages yet — say hello.</p>
          ) : null}

          {messages.map((message, index) => {
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
                />

                {index === lastIncomingIndex ? <ScamWarning /> : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* THE BOTTOM BAR. `w-full` + `self-stretch` are the spec's `width: '100%'`
          and `alignSelf: 'stretch'`, and `px-2`/`pb-2` are its 8px paddings.

          It is a FLEX SIBLING of the thread inside the locked `h-[100dvh]` column,
          not `position: fixed`. That is deliberate: a fixed bar at `bottom: 0`
          resolves against the viewport, and the composer would be painted under
          this route's own chrome. As a sibling it is always on screen, and
          `shrink-0` is what stops a long thread from compressing it below the 44px
          minimum touch target. `dvh` is what makes it ride up with the on-screen
          keyboard — see the note at the top of this file. */}
      <div
        className="relative z-10 w-full shrink-0 border-t px-2 pt-2"
        style={{
          /* OPAQUE fill, not GLASS_BAR. The composer is the last child of a
             column whose own gradient ends at its top edge — a translucent
             fill here lets the near-black canvas show through as a "dead"
             strip whenever the toolbar + quick chips pin it in place. The
             solid `#19152A` is GLASS_BAR composited over the canvas (same
             value EmojiPickerDrawer's sticky heading uses), so the bar reads
             as glass without ever going see-through. */
          backgroundColor: "#19152A",
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

<form onSubmit={onSubmit} className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Record a voice message"
            title="Voice message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#C9C2E4] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
          >
            <Mic className="h-5 w-5" aria-hidden />
          </button>

          <textarea
            ref={inputRef}
            value={draft}
            onFocus={() => {
              inputFocusedRef.current = true;
            }}
            onChange={(event) => {
              setDraft(event.target.value);
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

        {/* Quick action row under the input. `gap-2` is the EXPLICIT channel
            between buttons; each button paints its own solid muted slate fill
            (`#241E44`, the same non-white tone the bottom nav pills use) plus a
            hairline ring, so no two controls can visually merge into one bar and
            nothing here glows bright white against the dark composer. */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* THE GIFT BUTTON. A `<button>`, not a `<Link>`: it opens an overlay in
              place, so it must not navigate and must not be a link for assistive
              tech. `aria-expanded` tells a screen reader the drawer is a region it
              can return to. */}
          <button
            type="button"
            onClick={() => setGiftOpen(true)}
            aria-label="Send a gift"
            title="Gift"
            aria-expanded={giftOpen}
            aria-haspopup="dialog"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#241E44] text-[#C9C2E4] ring-1 ring-white/10 transition hover:bg-[#2E2752] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
          >
            <Gift className="h-5 w-5" aria-hidden />
          </button>

          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                aria-label={action.label}
                title={action.label}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#241E44] text-[#C9C2E4] ring-1 ring-white/10 transition hover:bg-[#2E2752] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
              >
                <Icon className="h-5 w-5" aria-hidden />
                {action.isNew ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-px text-[9px] font-bold text-white">
                    New
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

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
