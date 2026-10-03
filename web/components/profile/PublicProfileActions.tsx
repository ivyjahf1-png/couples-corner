"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Send, X } from "lucide-react";
import {
  cancelRequestAction,
  getConnectionStateAction,
  sendConnectionAction,
  type ActionResult,
} from "@/lib/actions/connections";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import { notifyFailure } from "@/components/ui/FailureToasts";
import { SHEET_BACKDROP, SHEET_PANEL_RELATIVE, SHEET_SHELL } from "@/components/ui/layers";
import type { ConnectionState } from "@/lib/feature/types";

/**
 * THE TWO BOTTOM-BAR ACTIONS ON A PUBLIC PROFILE.
 *
 * These live in their own file rather than inside `PublicProfileScreen` so the
 * screen stays a pure presentation component: everything that talks to the
 * network (the connection state machine, the first-message composer) is here.
 *
 * ── WHY NOT `ProfileConnectionActions` / `MessageProfileButton` ───────────────
 * Those two widgets are correct and are still used by the discover deck's detail
 * sheet. They are DARK-surface components though: their triggers are
 * `bg-white/[0.06]` on the navy shell and their composer sheet is `#0F172A`.
 * This screen is a LIGHT surface — a white bottom sheet over a photo — so those
 * triggers would render as near-invisible ghosts on white.
 *
 * What is reused is the DATA PATH, which is the part that must never fork:
 *
 *   • Follow → `getConnectionStateAction` / `sendConnectionAction` /
 *              `cancelRequestAction`. Identical to the discover deck, so the two
 *              entry points can never disagree about the connection state.
 *   • Chat   → `sendFirstImpressionAction`. It is find-or-creates, so a thread
 *              started here is the same inbox row a message started from
 *              discover would create.
 *
 * There is no route that opens an EMPTY direct conversation, so Chat cannot
 * simply navigate to a thread: it opens a short composer, then routes straight
 * into the conversation it created. An empty thread would be a dead end.
 */

/**
 * "Chat" — bright yellow, left half of the bottom bar.
 *
 * Opens a compact composer rather than jumping to a thread, then navigates into
 * the conversation the send created.
 */
export function ProfileChatButton({
  recipientId,
  recipientName,
}: {
  recipientId: string;
  recipientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const name = recipientName.trim() || "this member";

  async function send() {
    const text = body.trim();
    /* `busy` is re-checked here, not only on the button: Enter inside the textarea
       submits independently of the button's `disabled` state, so without this a
       fast double-Enter could create two conversations. */
    if (!text || busy) return;
    setBusy(true);
    try {
      const result = await sendFirstImpressionAction({ recipientId, body: text });
      if (!result.ok) {
        notifyFailure(result.error ?? "Couldn't send your message. Please try again.");
        return;
      }
      setOpen(false);
      setBody("");
      /* Straight into the thread, so the message is visibly DELIVERED rather than
         silently filed. Falls back to the inbox when no id came back. */
      if (result.conversationId) {
        router.push(`/messages/${result.conversationId}` as never);
      } else {
        router.push("/messages" as never);
      }
      router.refresh();
    } catch {
      notifyFailure("Couldn't send your message. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Chat with ${name}`}
        className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 text-sm font-bold text-slate-900 transition hover:bg-amber-500 ${FOCUS}`}
      >
        <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
        Chat
      </button>

      {open ? (
        <div
          className={SHEET_SHELL}
          role="dialog"
          aria-modal="true"
          aria-label={`Chat with ${name}`}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className={SHEET_BACKDROP}
          />
          <div
            className={`${SHEET_PANEL_RELATIVE} w-full max-w-sm rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-5`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-900">
                <MessageCircle className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900">Chat with {name}</h2>
                <p className="truncate text-xs text-slate-500">Start the conversation</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className={`ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 ${FOCUS}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="relative">
              <label htmlFor="public-profile-message" className="sr-only">
                Your message
              </label>
              <textarea
                id="public-profile-message"
                rows={3}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={`Say hello to ${name}...`}
                maxLength={500}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-14 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
                /* Enter sends; Shift+Enter is a newline. */
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!body.trim() || busy}
                aria-label="Send message"
                title="Send"
                className={`absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full transition ${FOCUS} ${
                  body.trim() && !busy
                    ? "bg-slate-900 text-amber-400 hover:bg-slate-800"
                    : "border border-slate-200 bg-white text-slate-300"
                }`}
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[11px] text-slate-400">
                Enter to send · Shift+Enter for a new line
              </span>
              <span className="text-[11px] tabular-nums text-slate-400">{body.length}/500</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Shared focus ring, matching the light theme of this screen. */
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

/**
 * "Follow" — black pill with a yellow heart, right half of the bottom bar.
 *
 * THE STATE MACHINE, AND WHY EACH LABEL IS WHAT IT IS.
 *   none             → "Follow"     send a request
 *   outgoing_pending → "Requested"  tapping again CANCELS it. A pending request
 *                      the member cannot withdraw is a trap, not a feature, so
 *                      the button stays ENABLED in this state.
 *   incoming_pending → "Accept"     this is a request aimed at the VIEWER
 *   connected        → "Following"  disabled
 *   self             → "Following"  disabled
 *
 * `connected` and `self` are terminal for the actions this app has: there is no
 * unfollow / remove-follower server action to call, so the button is disabled
 * rather than wired to an action that does not exist. A control that implies an
 * action it cannot perform is worse than an honestly inert one.
 */
export function ProfileFollowButton({
  targetUserId,
  viewerUid,
  onStateResolved,
}: {
  targetUserId: string;
  viewerUid: string | null;
  /**
   * Reports the resolved state upward so the screen can hide its own action bar
   * on the self view, instead of each piece re-deriving "am I looking at myself?"
   * from the target id independently.
   */
  onStateResolved?: (state: ConnectionState) => void;
}) {
  const [state, setState] = useState<ConnectionState>("none");
  /* `cancelRequestAction` takes a REQUEST id, not a user id. It is held here
     rather than fetched again on tap so withdrawing cannot race a state change
     and cancel the wrong request. Null until the first successful read. */
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  /* Without a signed-in viewer there is no actor to act AS — the server actions
     re-resolve the session and would fail anyway, so no request is made and the
     button renders disabled rather than throwing on an unauthenticated tap. */
  const canAct = Boolean(viewerUid) && targetUserId.trim().length > 0;

  /* Seed the authoritative state on mount and whenever the PAIR changes, so
     landing here from two different members never shows the previous member's
     relationship. `cancelled` guards the unmount case: a member can tap Back
     while this is in flight, and a late setState would target a dead component.

     A rejection resolves to "not connected" rather than surfacing as an
     unhandled rejection that trips the error boundary: failing to READ a follow
     state must never break the profile screen itself. */
  useEffect(() => {
    if (!canAct) {
      setLoading(false);
      onStateResolved?.("none");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getConnectionStateAction(targetUserId)
      .then((res) => {
        if (cancelled) return;
        setState(res.state);
        setRequestId(res.requestId);
        onStateResolved?.(res.state);
      })
      .catch(() => {
        if (cancelled) return;
        setState("none");
        setRequestId(null);
        onStateResolved?.("none");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    /* `onStateResolved` is deliberately NOT a dependency: callers pass an inline
       arrow, so including it would tear this effect down and re-fire the fetch
       on every render. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAct, targetUserId]);

  /* ONE mutation path for every action. Nothing is changed optimistically: on
     success the authoritative state is re-read from the server, so the label can
     never claim a follow that did not actually happen. */
  function run(fn: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        notifyFailure(result.error ?? "That didn't go through. Please try again.");
        return;
      }
      const fresh = await getConnectionStateAction(targetUserId);
      setState(fresh.state);
      setRequestId(fresh.requestId);
      onStateResolved?.(fresh.state);
    });
  }

  const isPendingRequest = state === "outgoing_pending";
  const isTerminal = state === "connected" || state === "self";
  const canCancel = isPendingRequest && canAct && !pending && Boolean(requestId);
  const canSend = canAct && !pending && !isTerminal;

  const label = isTerminal
    ? "Following"
    : isPendingRequest
      ? "Requested"
      : state === "incoming_pending"
        ? "Accept"
        : "Follow";

  return (
    <button
      type="button"
      disabled={!canAct || isTerminal}
      onClick={() => {
        if (!canAct || pending) return;
        /* "Requested" is a WITHDRAW control, not a dead end — that is what keeps
           this state enabled while the two terminal states are not. */
        if (canCancel && requestId) {
          run(() => cancelRequestAction(requestId));
          return;
        }
        if (!canSend) return;
        run(() => sendConnectionAction(targetUserId));
      }}
      aria-label={
        canCancel
          ? "Cancel your follow request"
          : state === "incoming_pending"
            ? "Accept their follow request"
            : label
      }
      aria-busy={pending || (loading && canAct)}
      className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 text-sm font-bold text-amber-400 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 ${FOCUS}`}
    >
      <Heart className="h-[18px] w-[18px]" aria-hidden fill="currentColor" />
      {loading && canAct ? "Loading…" : label}
    </button>
  );
}
