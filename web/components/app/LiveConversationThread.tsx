"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import {
  COPY_ONLY_ACTIONS,
  MESSAGE_ACTIONS,
  MessageActionsMenu,
  type MessageAction,
} from "@/components/app/MessageActionsMenu";
import { deleteMessageAction, editMessageAction } from "@/lib/actions/messaging";
import { MissedCallCard } from "@/components/app/MissedCallCard";
import type { CallLogEntry } from "@/lib/feature/types";
import { Avatar } from "@/components/app/Avatar";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string | null;
  created_at: string;
  updated_at?: string | null;
  /**
   * Set ONLY by the edit path. Null means the message has never been edited.
   *
   * NOT RENDERED ANYWHERE. The "edited" label was removed from the bubble by
   * product decision; this field is kept on the wire type because it is still
   * written and returned by the server (see migration 044), and leaving it
   * declared documents the shape of the payload the client actually receives.
   * Do not re-add an `edited` tag on the strength of this field — the
   * timestamp is for auditing, not display.
   */
  edited_at?: string | null;
}

interface LiveConversationThreadProps {
  conversationId: string;
  currentUserId: string;
  initialMessages?: Message[];
  /**
   * The other participant, used only to draw the avatar beside each incoming
   * bubble. Optional so the thread still renders (avatars simply drop out) if a
   * caller has no summary — a missing avatar must never break the thread.
   */
  participant?: ConversationParticipantSummary | null;
  /**
   * Call history, merged into the timeline by `started_at`.
   *
   * Empty until migration 048 is applied, and until a call is placed, so the
   * thread is byte-for-byte the message list it always was. A call that cannot be
   * read is simply not drawn — see the note in `lib/server/calls.ts`.
   */
  calls?: CallLogEntry[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

/**
 * Centred "Today" / "Yesterday" / "23 Sept" separator between day groups.
 *
 * Extracted because it was written out TWICE — once in the call branch, once in
 * the message branch — and the two had already begun to drift. A separator that
 * sits above a missed call must look identical to one above a message, or the
 * thread reads as two different feeds stitched together.
 *
 * ── ORANGE WAS HERE, AND IT WAS WRONG ────────────────────────────────────────
 * This pill briefly carried the brand orange as a low-alpha `color-mix` ring and
 * tint, on the argument that Midnight Slate & Orange should read "end to end".
 * That was the wrong call, and it was mine.
 *
 * Orange in this app means two specific things: YOU, and DO THIS. It is on
 * outgoing bubbles because those are the member's own words, and on primary
 * actions because those are the things to press. A date separator is neither —
 * it is furniture. Accenting it spent a colour that carries meaning, on
 * something that does not, so a passive divider competed with the one thing in
 * the frame that is genuinely actionable.
 *
 * Muted slate now. `bg-slate-800` sits one step off the canvas, which is exactly
 * how far a divider should recede, and `text-slate-400` reads clearly at 11px
 * without asking for attention.
 *
 * Deliberately literal slate rather than `--chat-*` tokens: this is now a fixed
 * Midnight Slate element by design, and pulling it from a token would let the
 * Daylight theme wash it out again — which is the failure this change is fixing.
 */
function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center" role="separator" aria-label={label}>
      <span className="rounded-full bg-slate-800 px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">
        {label}
      </span>
    </div>
  );
}

/**
 * Live chat thread with Supabase Realtime subscription.
 *
 * Merges initial (server-fetched) messages with realtime INSERT/UPDATE
 * events so new messages appear instantly without a page refresh.
 *
 * UI: centered date-separator pills, dark incoming cards on the left,
 * vibrant purple outgoing bubbles on the right with timestamps.
 */
export function LiveConversationThread({
  conversationId,
  currentUserId,
  initialMessages = [],
  participant = null,
  calls = [],
}: LiveConversationThreadProps) {
  const { messages: realtimeMessages, isConnected } = useRealtimeMessages({
    conversationId,
    enabled: true,
  });

  const [renderTick, setRenderTick] = useState(0);
  // Message currently being edited inline, plus the draft text for it.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // Inline error (e.g. "you can only edit messages you sent") shown under the
  // thread rather than in a toast, so it is unambiguously about this message.
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Merge initial messages with realtime ones, deduplicating by id
  const merged = useRef<Map<string, Message>>(new Map());

  // Seed with initial messages
  useEffect(() => {
    merged.current.clear();
    for (const m of initialMessages) {
      merged.current.set(m.id, m);
    }
    setRenderTick((t) => t + 1);
  }, [initialMessages]);

  // Merge realtime inserts
  useEffect(() => {
    let changed = false;
    for (const m of realtimeMessages) {
      if (!merged.current.has(m.id)) {
        merged.current.set(m.id, m);
        changed = true;
      }
    }
    if (changed) setRenderTick((t) => t + 1);
  }, [realtimeMessages]);

  // Apply realtime UPDATEs in place.
  //
  // The insert-only merge above meant an edit made by the other participant (or
  // by this one on another device) never reached the open thread. Applying the
  // full row on UPDATE is what makes an edited message visibly change for
  // everyone in the conversation.
  useEffect(() => {
    let changed = false;
    for (const m of realtimeMessages) {
      const existing = merged.current.get(m.id);
      // Only rewrite when something actually changed, so an unrelated presence
      // or read_at tick cannot restart the auto-scroll effect every time.
      if (existing && (existing.body ?? "") !== (m.body ?? "")) {
        // `edited_at` must be carried through too, or an edit made on another
        // device updates the text but leaves the bubble unlabelled.
        merged.current.set(m.id, {
          ...existing,
          body: m.body,
          updated_at: m.updated_at,
          edited_at: m.edited_at,
        });
        changed = true;
      }
    }
    if (changed) setRenderTick((t) => t + 1);
  }, [realtimeMessages]);

  /** Apply an edit to the local map so the UI updates without a round trip. */
  function applyLocalEdit(messageId: string, body: string) {
    const existing = merged.current.get(messageId);
    if (!existing) return;
    const stamp = new Date().toISOString();
    // `edited_at` is stamped locally as well, so the optimistic bubble and the
    // row the server echoes back agree. Nothing renders it today; it is kept in
    // sync for audit and so the two sources cannot drift.
    merged.current.set(messageId, {
      ...existing,
      body,
      updated_at: stamp,
      edited_at: stamp,
    });
    setRenderTick((t) => t + 1);
  }

  /** Remove a message from the local map immediately after a confirmed delete. */
  function applyLocalDelete(messageId: string) {
    merged.current.delete(messageId);
    setRenderTick((t) => t + 1);
  }

  function beginEdit(message: Message) {
    setActionError(null);
    setEditingId(message.id);
    setDraft(message.body ?? "");
    // Focus the textarea on the next frame so the keyboard opens immediately on
    // mobile; without this the member taps "Edit" and nothing appears to happen.
    window.setTimeout(() => {
      const el = editInputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setActionError(null);
  }

  async function saveEdit(messageId: string) {
    const body = draft.trim();
    if (!body) {
      setActionError("A message cannot be empty. Delete it instead.");
      return;
    }
    setBusy(true);
    setActionError(null);
    // Optimistic: the bubble updates immediately, and a failure reverts it.
    const previous = merged.current.get(messageId)?.body ?? "";
    // Capture the ORIGINAL marker so a failed save can restore it verbatim.
    // Reverting through `applyLocalEdit` would stamp a fresh `edited_at` and
    // permanently label a message whose edit never actually landed.
    const previousEditedAt = merged.current.get(messageId)?.edited_at ?? null;
    applyLocalEdit(messageId, body);
    const result = await editMessageAction({ messageId, body }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      merged.current.set(messageId, {
        ...merged.current.get(messageId)!,
        body: previous,
        edited_at: previousEditedAt,
      });
      setRenderTick((t) => t + 1);
      setActionError(result?.error ?? "Couldn't save your edit. Please try again.");
      return;
    }
    setEditingId(null);
    setDraft("");
  }

  async function removeMessage(messageId: string) {
    setBusy(true);
    setActionError(null);
    const result = await deleteMessageAction({ messageId }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      setActionError(result?.error ?? "Couldn't delete that message.");
      return;
    }
    applyLocalDelete(messageId);
  }

  async function copyMessage(messageId: string) {
    const body = merged.current.get(messageId)?.body ?? "";
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(messageId);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Clipboard access can be denied (insecure origin, permission). Say so
      // instead of silently doing nothing.
      setActionError("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  const handleMessageAction = useCallback(
    (action: MessageAction, messageId: string) => {
      const message = merged.current.get(messageId);
      if (!message) return;
      if (action.id === "edit") beginEdit(message);
      else if (action.id === "delete") void removeMessage(messageId);
      else if (action.id === "copy") void copyMessage(messageId);
    },
    // The handlers read `merged.current` (a ref) and only touch setters, so no
    // changing dependency is required for correctness here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  void renderTick;

  const messages = Array.from(merged.current.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  /* Merge calls into the message timeline by their REAL start time.
     Sorting the two lists together and walking once is what puts a missed call
     between the messages that surrounded it. Appending calls at the end — the
     obvious shortcut — would file a call that happened last Tuesday below
     everything sent since, which is a different history from the one that
     happened.

     Keyed by kind because a message id and a call id are different namespaces
     and can collide; without the prefix a call could be dropped as a duplicate
     of a message. */
  const timeline: Array<
    | { kind: "message"; at: number; message: (typeof messages)[number] }
    | { kind: "call"; at: number; call: CallLogEntry }
  > = [
    ...messages.map((message) => ({
      kind: "message" as const,
      at: new Date(message.created_at).getTime(),
      message,
    })),
    ...(calls ?? []).map((call) => ({
      kind: "call" as const,
      at: new Date(call.startedAt).getTime(),
      call,
    })),
  ].sort((a, b) => a.at - b.at);

  const listRef = useRef<HTMLUListElement>(null);

  // Auto-scroll to bottom on new message.
  //
  // This <ul> is NOT the scroll container - the page-level wrapper is. So we
  // resolve the nearest scrolling ancestor and scroll that; falling back to the
  // element itself keeps this working if the structure ever changes back.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const scroller = el.closest("[data-chat-scroll]") as HTMLElement | null;
    const target = scroller ?? el;
    target.scrollTop = target.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-lg font-semibold text-[var(--chat-text)]">No messages yet</p>
        <p className="text-sm text-[var(--chat-muted)]">Send the first message to start the chat.</p>
        {!isConnected && (
          <p className="text-xs text-[var(--chat-muted)]">Connecting to realtime…</p>
        )}
      </div>
    );
  }

  let lastDay = "";

  return (
    <div className="flex flex-col">
      {/* Timeline. Padding lives on the page-level scroll wrapper, so it is
          omitted here to avoid doubling it. This <ul> is intentionally NOT a
          scroll container: two nested overflow-y-auto regions cause scroll
          chaining, which is the erratic bouncing this page used to have.

          `role="log"` is retained, but it is now a MIXED log — messages and call
          events interleaved. That is still correct for the role: assistive tech
          announces additions to it in order, which is what a conversation wants.
          `aria-label` says "Conversation" rather than "Messages" because it is
          no longer only messages. */}
      <ul
        ref={listRef}
        className="flex flex-col gap-2 overflow-x-hidden"
        aria-label="Conversation"
        role="log"
      >
        {timeline.map((item) => {
          // One day-pill rule across BOTH kinds, so a call does not reset the
          // date separator and stamp "Today" again on the next message.
          const at = item.kind === "message" ? item.message.created_at : item.call.startedAt;
          const day = dayLabel(at);
          const showDayPill = day !== lastDay;
          lastDay = day;

          if (item.kind === "call") {
            return (
              <li key={`call-${item.call.id}`} className="flex flex-col">
                {showDayPill ? <DayDivider label={day} /> : null}
                <div className="flex justify-center py-1">
                  <MissedCallCard entry={item.call} viewerId={currentUserId} />
                </div>
              </li>
            );
          }

          const message = item.message;
          const isMine = message.sender_id === currentUserId;
          return (
            <li key={message.id} className="flex flex-col">
              {showDayPill ? <DayDivider label={day} /> : null}
              <div
                className={[
                  "flex items-end gap-2",
                  /* `ml-auto` is added alongside `justify-end` deliberately,
                     not instead of it.

                     `justify-end` distributes leftover space in the row, but the
                     bubble is not a DIRECT child of this row — `MessageActionsMenu`
                     renders an unstyled wrapper `<div>` between them, and that
                     wrapper is what actually gets pushed. Whether the edge is
                     truly pinned therefore depends on how that wrapper resolves
                     its own width, which is exactly the kind of indirection that
                     lets a sent bubble drift into the middle of a wide screen.

                     `ml-auto` on the row's first child removes the dependency:
                     margin-left:auto absorbs the free space, so the bubble ends
                     flush right no matter what the wrapper does. Cheap, and it
                     makes the intent explicit rather than emergent. */
                  isMine ? "ml-auto justify-end" : "mr-auto justify-start",
                ].join(" ")}
              >
                {/* Incoming avatar, in the gutter LEFT of the bubble.
                    Rendered only on received messages: a member never needs
                    their own face beside their own words, and mirroring it would
                    put a circle in the far corner where the timestamps sit.

                    The `items-end` on the row keeps it bottom-aligned with the
                    bubble rather than floating to the top of a tall message, so
                    a one-word "ok" and a four-line paragraph both read as one
                    exchange. It is a fixed 8px disc (2rem) to stay visually
                    subordinate to the 20px+ bubble. */}
                {isMine ? null : (
                  <span className="w-8 shrink-0">
                    <Avatar
                      src={participant?.avatarUrl ?? null}
                      name={participant?.name ?? "Chat"}
                      kind={participant?.kind}
                      className="h-8 w-8 text-[11px]"
                    />
                  </span>
                )}
                {/*
                  Permission model: the menu is offered on EVERY bubble, but the
                  action set depends on who sent it.

                    own message      -> Edit, Delete, Copy
                    someone else's   -> Copy only

                  Edit and Delete are hidden rather than disabled, so a long-press
                  on an incoming bubble still does something useful. The server
                  independently enforces the same rule — the UPDATE/DELETE carry
                  `sender_id` in their WHERE clause — so this is presentation, not
                  the security boundary.

                  The wrapper renders on both sides to keep the DOM shape uniform;
                  a differing subtree per side is what made row heights drift
                  between left- and right-aligned bubbles.
                */}
                <MessageActionsMenu
                  messageId={message.id}
                  actions={isMine ? MESSAGE_ACTIONS : COPY_ONLY_ACTIONS}
                  onAction={handleMessageAction}
                  disabled={busy}
                >
                  {editingId === message.id ? (
                    /* Inline editor: the bubble becomes a textarea with
                       Save/Cancel, so the edit happens in place rather than in a
                       modal that loses the thread's scroll position.

                       Takes the same tokens as the sent bubble it replaces, so
                       the editor reads as "this bubble, now editable" rather
                       than a foreign violet panel appearing mid-thread — the old
                       purple ramp matched nothing else on the page, and on the
                       light canvas it was the single darkest thing in view. */
                    <div className="w-[min(80%,32rem)] rounded-2xl rounded-br-md border border-[var(--chat-border)] p-2 [background-image:linear-gradient(135deg,var(--chat-out-from),var(--chat-out-to))] shadow-md">
                      <textarea
                        ref={editInputRef}
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          // Grow to fit so a long edit is never hidden behind a
                          // 1-row box.
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void saveEdit(message.id);
                          }
                          if (e.key === "Escape") cancelEdit();
                        }}
                        rows={1}
                        aria-label="Edit message"
                        // The wrapper suppresses the native long-press callout, but
                        // the textarea is a separate focusable element with its own
                        // gesture handling, so it needs the suppression too or a press
                        // inside the editor raises the OS callout instead of the menu.
                        className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-[var(--chat-out-text)] outline-none placeholder:text-[var(--chat-out-text)]/70 select-none [-webkit-touch-callout:none]"
                      />
                      <div className="flex items-center justify-end gap-2 px-1 pb-0.5 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-full px-3 py-1 text-xs font-medium text-[var(--chat-out-text)]/90 transition hover:bg-black/10"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit(message.id)}
                          disabled={busy || !draft.trim()}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#7c2d12] transition hover:bg-white/90 disabled:opacity-50"
                        >
                          {busy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* The timestamp lives BESIDE the bubble, not inside it.

                       Inside, it forced every bubble to carry its own bottom
                       padding for a 11px line, and it made a short "ok" and a
                       four-line paragraph two different visual weights for the
                       same content. Tucked beneath and aligned to the bubble's
                       own edge, the bubble holds only the message — which is
                       what a bubble is for — and the time is still attached to
                       it. */
                    <div className="min-w-0 max-w-[75%] sm:max-w-[70%]">
                      <div
                        className={[
                          // `break-words` is the fix for long unbroken content.
                          //
                          // `max-w-[80%` caps the box but does NOT stop the text
                          // overflowing it: a flex item's default `min-width:
                          // auto` means a single unbreakable token — a URL, a
                          // handle, a 60-character string of no spaces — resolves
                          // to its intrinsic width and pushes straight through
                          // the cap. `min-w-0` on the wrapper lets the flex item
                          // actually shrink, and `break-words` (overflow-wrap:
                          // break-word) breaks that token at the box edge
                          // instead. Both are needed: either alone still
                          // overflows.
                          //
                          // Everything else is intrinsic sizing already — no fixed
                          // width anywhere, so a one-word "ok" hugs and a
                          // paragraph wraps. That part was correct.
                          "break-words px-4 py-2.5 text-sm leading-6",
                          // SENT vs RECEIVED — the core hierarchy of the thread.
                          //
                          // Both sides read from the theme's tokens rather than
                          // hardcoded colours. That indirection is what makes the
                          // light theme possible at all: a literal `text-white`
                          // received bubble is invisible on a #F7F7F8 canvas.
                          //
                          // Sent stays the app's orange accent and received stays
                          // a raised neutral slate card, so colour and alignment
                          // BOTH carry the left/right split — the thread is still
                          // readable for anyone who cannot rely on position alone.
                          isMine
                            ? "rounded-2xl rounded-br-md text-[var(--chat-out-text)] [background-image:linear-gradient(135deg,var(--chat-out-from),var(--chat-out-to))] shadow-md"
                            : "rounded-2xl rounded-bl-md border text-[var(--chat-in-text)] [background-color:var(--chat-in-bg)] [border-color:var(--chat-in-border)] [box-shadow:var(--chat-in-shadow)]",
                        ].join(" ")}
                      >
                        {message.body}
                      </div>
                      <span
                        className={[
                          "mt-1 flex items-center gap-1.5 px-1 text-[11px]",
                          // Aligned to the bubble's own edge, so the time reads as
                          // belonging to THAT bubble rather than floating in the
                          // middle of the thread's width.
                          isMine ? "justify-end" : "justify-start",
                          isMine ? "text-[var(--chat-out-text)]/70" : "text-[var(--chat-muted)]",
                        ].join(" ")}
                      >
                        {copiedId === message.id ? (
                          <span className="font-medium text-emerald-400">Copied</span>
                        ) : null}
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  )}
                </MessageActionsMenu>
              </div>
            </li>
          );
        })}
      </ul>

      {actionError ? (
        <p
          role="alert"
          className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-[var(--chat-text)]"
        >
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
