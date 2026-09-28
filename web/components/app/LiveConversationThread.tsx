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
   * See `hasBeenEdited` below and migration 044 for why this cannot be
   * inferred from `updated_at`.
   */
  edited_at?: string | null;
}

interface LiveConversationThreadProps {
  conversationId: string;
  currentUserId: string;
  initialMessages?: Message[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Has this message been edited?
 *
 * WHY THIS IS A NULL CHECK AND NOT A TIMESTAMP COMPARISON — the bug this fixes:
 *
 * The thread used to render the tag from
 *
 *     updated_at && new Date(updated_at) > new Date(created_at) + 1000
 *
 * which reported "edited" on essentially every message. The `+ 1000` fudge made
 * it look deliberate, so the real defect went unexamined: `markConversationRead`
 * was stamping `updated_at` on every unread message each time a conversation was
 * OPENED, because a read receipt is an update and shared that column.
 *
 * A REAL EDIT ALSO MOVES `updated_at`. So the two are indistinguishable by
 * comparison, and no threshold fixes that: tight enough to survive read-receipt
 * drift and you miss genuine edits; loose enough to catch them and untouched
 * messages get labelled. Worse, rows already stamped look genuinely edited
 * forever, so the damage is not undone by fixing the UI.
 *
 * The fix removes the ambiguity instead of tolerating it. `edited_at`
 * (migration 044) is written ONLY by the edit path, and marking a message as
 * read no longer touches `updated_at` at all. "Is this edited?" is now a single
 * null check that cannot drift.
 *
 * The `updated_at` comparison is retained ONLY as a fallback for rows written
 * between the app deploy and the migration landing, where `edited_at` does not
 * exist yet. Those rows are few and the window is one deploy; once the
 * migration has run, `edited_at` is always present and this branch is dead.
 */
function hasBeenEdited(message: Message): boolean {
  // AUTHORITATIVE PATH — the row carries the marker, so it knows the answer.
  //
  // The `in` check, not a truthiness check, is load-bearing. A row that HAS the
  // column and holds NULL is a definitive "this message was never edited", and
  // it must answer from that alone. Falling through to the timestamp
  // comparison on a null marker is exactly the original bug: a read receipt
  // moves `updated_at` forward, the comparison says "edited", and the null —
  // which is the only trustworthy signal on that row — is ignored.
  if ("edited_at" in message) return Boolean(message.edited_at);

  // FALLBACK — pre-migration rows, which have no marker to consult. These are
  // the only rows still judged by comparison, and they are judged with the
  // same heuristic that caused the bug, because nothing better is available
  // for them. The window closes once migration 044 has been applied.
  if (!message.updated_at || !message.created_at) return false;
  const created = new Date(message.created_at).getTime();
  const updated = new Date(message.updated_at).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return updated > created;
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
    // `edited_at` is set locally too, otherwise the optimistic bubble would
    // render WITHOUT the "edited" tag and only pick it up when the server
    // echoed the row back.
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
        <p className="text-lg font-semibold text-white">No messages yet</p>
        <p className="text-sm text-ink-400">Send the first message to start the chat.</p>
        {!isConnected && (
          <p className="text-xs text-ink-400">Connecting to realtime…</p>
        )}
      </div>
    );
  }

  let lastDay = "";

  return (
    <div className="flex flex-col">
      {/* Message list. Padding lives on the page-level scroll wrapper, so it is
          omitted here to avoid doubling it. This <ul> is intentionally NOT a
          scroll container: two nested overflow-y-auto regions cause scroll
          chaining, which is the erratic bouncing this page used to have. */}
      <ul
        ref={listRef}
        className="flex flex-col gap-2 overflow-x-hidden"
        aria-label="Messages"
        role="log"
      >
        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId;
          const day = dayLabel(message.created_at);
          const showDayPill = day !== lastDay;
          lastDay = day;
          return (
            <li key={message.id} className="flex flex-col">
              {showDayPill ? (
                <div className="mb-2 mt-1 flex justify-center">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-ink-300">
                    {day}
                  </span>
                </div>
              ) : null}
              <div className={isMine ? "flex justify-end" : "flex justify-start"}>
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
                       modal that loses the thread's scroll position. */
                    <div className="w-[min(80%,32rem)] rounded-2xl rounded-br-md border border-white/15 bg-gradient-to-br from-violet-600 to-purple-600 p-2 shadow-lg shadow-purple-950/40">
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
                        className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-white outline-none placeholder:text-white/60 select-none [-webkit-touch-callout:none]"
                      />
                      <div className="flex items-center justify-end gap-2 px-1 pb-0.5 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-full px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit(message.id)}
                          disabled={busy || !draft.trim()}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-purple-700 transition hover:bg-white/90 disabled:opacity-50"
                        >
                          {busy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={[
                        "max-w-[80%] px-4 py-2.5 text-sm leading-6 sm:max-w-[70%]",
                        // SENT vs RECEIVED — the core hierarchy of the thread.
                        //
                        // The two used to be a purple gradient and a solid
                        // slate card. Purple read as a brand accent on BOTH
                        // sides of the conversation, because the received card
                        // was dark enough to blend into the page background
                        // and the two styles only differed in hue. Alignment
                        // alone (right vs left) was doing all the work.
                        //
                        // Sent is now the app's actual accent — an orange
                        // brand tint with a warm border, matching the Midnight
                        // Slate & Orange theme used across the profile and feed
                        // rather than a second, competing purple ramp. Received
                        // is a translucent slate that visibly sits ON the canvas
                        // instead of dissolving into it. Colour and luminance
                        // now reinforce the alignment cue rather than duplicate
                        // it, so the thread reads correctly at a glance and to
                        // anyone who cannot rely on position alone.
                        isMine
                          ? "rounded-2xl rounded-br-md border border-orange-400/25 bg-gradient-to-br from-orange-500/85 to-orange-600/80 text-white shadow-lg shadow-orange-950/30"
                          : "rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] text-white shadow-md shadow-black/25 backdrop-blur-sm",
                      ].join(" ")}
                    >
                      {message.body}
                      <span
                        aria-hidden
                        className={[
                          "mt-1 flex items-center justify-end gap-1.5 text-[11px]",
                          // The old pair (white/70 vs ink-400) was tuned for a
                          // violet bubble and a near-black card. The sent bubble
                          // is now a lighter orange, which needs a touch more
                          // contrast for the meta line, while the received
                          // bubble is lighter than the old #1E293B, so its
                          // timestamp moves up a step to stay readable.
                          isMine ? "text-white/80" : "text-ink-300",
                        ].join(" ")}
                      >
                        {hasBeenEdited(message) ? (
                          <span className="italic">edited</span>
                        ) : null}
                        {copiedId === message.id ? (
                          <span className="font-medium text-emerald-200">Copied</span>
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
          className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
        >
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
