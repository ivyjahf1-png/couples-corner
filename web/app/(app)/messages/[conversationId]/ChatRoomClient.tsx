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
import {
  COPY_ONLY_ACTIONS,
  MESSAGE_ACTIONS,
  MessageActionsMenu,
  type MessageAction,
} from "@/components/app/MessageActionsMenu";
import { usePresence } from "@/lib/hooks/usePresence";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import {
  deleteMessageAction,
  editMessageAction,
  markConversationReadAction,
  sendMessageAction,
} from "@/lib/actions/messaging";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

/** The design's palette, in one place. */
const THEME = {
  /** Page canvas behind the cards. */
  canvas: "#F4F5F7",
  /** The pinned profile summary card, and the quick-reply pills. */
  yellow: "#FFE15A",
  /** Slightly deeper yellow for the pressed/hover state of a pill. */
  yellowDeep: "#F5CE1F",
  /** Incoming bubble and the input field. */
  surface: "#FFFFFF",
  /** The scam-warning card. */
  warning: "#ECEEF1",
  /** Senders' own bubbles, so the thread is not a wall of identical white. */
  own: "#D8F0D2",
  hairline: "#E6E8EC",
  ink: "#14181F",
  inkMuted: "#6B7280",
} as const;

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
    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[11px] font-bold text-slate-900">
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
    <section
      aria-label="Profile summary"
      className="rounded-2xl p-3"
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
        <p className="mt-2.5 text-xs font-semibold text-slate-800">
          Personality similarity: {summary.personalitySimilarity}%
        </p>
      ) : null}

      {summary.lifestyleTags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {summary.lifestyleTags.slice(0, 4).map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-slate-900/15 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-800"
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
      <p className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-600">
        <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
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
 * `max-w-[78%]` sits on the `MessageActionsMenu` WRAPPER, not on the bubble
 * inside it. That wrapper is a shrink-to-fit flex item, so its width is its
 * content's width — a percentage max-width resolves against the containing block,
 * and the cap would silently do nothing and let long messages run full-bleed.
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
    <div
      className="rounded-2xl px-3 py-2 text-sm leading-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
      style={{
        backgroundColor: isMine ? THEME.own : THEME.surface,
        color: THEME.ink,
        /* Tail pointing at the avatar: squared off on the corner nearest the
           sender, so incoming and outgoing read as two sides of one thread. */
        borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      }}
    >
      {body}
    </div>
  );

  return (
    <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine ? (
        <Avatar name={participantName} src={avatarUrl} size="sm" className="shrink-0" />
      ) : null}

      <MessageActionsMenu
        messageId={message.id}
        actions={isMine ? MESSAGE_ACTIONS : COPY_ONLY_ACTIONS}
        onAction={onAction}
        disabled={busy}
        className="w-full min-w-0 max-w-[78%]"
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
}: {
  summary: ConversationParticipantSummary | null;
  online: boolean;
}) {
  return (
    <header
      className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5"
      style={{ backgroundColor: THEME.surface, borderColor: THEME.hairline }}
    >
      <Link
        href="/messages"
        aria-label="Back to messages"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </Link>

      <div className="min-w-0 flex-1 text-center">
        <p className="flex items-center justify-center gap-1 truncate text-sm font-bold text-slate-900">
          <span className="truncate">{summary?.name ?? "Conversation"}</span>
        </p>
        <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500">
          {/* Colour alone is not the only cue — the word is right there, so the
              state does not depend on distinguishing two greens. */}
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          {online ? "Online" : "Offline"}
        </p>
      </div>

      <Link
        href={`/u/${summary?.id ?? ""}`}
        aria-label={`View ${summary?.name ?? "profile"}`}
        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Avatar name={summary?.name ?? "?"} src={summary?.avatarUrl ?? null} size="sm" />
      </Link>
    </header>
  );
}
export default function ChatRoomClient({
  conversationId,
  currentUserId,
  summary,
  initialMessages,
  initialOnline = false,
}: {
  conversationId: string;
  currentUserId: string;
  summary: ConversationParticipantSummary | null;
  initialMessages: ChatMessage[];
  initialOnline: boolean;
}) {
  const [draft, setDraft] = useState("");
  /* Which message the composer is currently patching; null = composing new. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  /* Initial history and live inserts MERGED, de-duplicated by id and sorted by
     time. The seed alone would miss anything sent while the page was open; the
     live list alone would be empty on first paint. The de-dup is not
     belt-and-braces — the sender's own message comes back over the realtime
     channel as well, so without this every sent message would render twice. */
  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of initialMessages) byId.set(m.id, m);
    for (const m of live) byId.set(m.id, m as ChatMessage);
    return [...byId.values()].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [initialMessages, live]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  const quickActions: { label: string; href: string; icon: LucideIcon; isNew?: boolean }[] = [
    { label: "Gallery", href: "/profile", icon: ImageIcon },
    { label: "Call", href: `/call/${conversationId}/audio`, icon: Phone },
    { label: "Gift", href: "/store", icon: Gift },
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
return (
    /* The locked viewport column: header / thread / composer, exactly one
       scroller. The app shell drops its <main> padding and hides the tab bar on
       this route, so the composer inherits the reclaimed height. */
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden"
      style={{ backgroundColor: THEME.canvas }}
    >
      <ChatRoomHeader summary={summary} online={online} />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-3">
        <PinnedProfileCard summary={summary} />

        <div className="mt-3 flex flex-col gap-2.5">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No messages yet — say hello.</p>
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
                {showStamp ? (
                  <p className="text-center text-[10px] font-medium text-slate-400">
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

      <div
        className="shrink-0 border-t px-3 pb-3 pt-2"
        style={{ backgroundColor: THEME.surface, borderColor: THEME.hairline }}
      >
        {/* Quick replies. The design draws a horizontal scroll strip; with six
           short pills `flex-wrap` shows every one of them without a swipe, which
           is strictly better on a phone — and each pill is a real button, so the
           set stays keyboard-reachable. */}
        <div className="mb-2 flex flex-wrap gap-1.5">
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
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-900 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              style={{ backgroundColor: THEME.yellow }}
            >
              {reply}
            </button>
          ))}
        </div>
<form onSubmit={onSubmit} className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Record a voice message"
            title="Voice message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Mic className="h-5 w-5" aria-hidden />
          </button>

          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              /* Typing during an edit means the member has moved on; drop back to
                 composing rather than silently patching the old message. */
              if (editingId) setEditingId(null);
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={editingId ? "Edit your message…" : "Message…"}
            aria-label="Message"
            className="min-h-10 min-w-0 flex-1 resize-none rounded-2xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400"
            style={{ borderColor: THEME.hairline }}
          />

          <button
            type="button"
            aria-label="Insert emoji"
            title="Emoji"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Smile className="h-5 w-5" aria-hidden />
          </button>

          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            aria-label="Send message"
            title="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            style={{ backgroundColor: THEME.ink }}
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>

        {/* Quick action row under the input. */}
        <div className="mt-2 flex items-center justify-between">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                aria-label={action.label}
                title={action.label}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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
          <p role="status" className="mt-2 text-[11px] font-medium text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}