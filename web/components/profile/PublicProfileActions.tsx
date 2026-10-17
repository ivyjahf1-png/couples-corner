"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Send, X, Sparkles, Coins, AlertCircle } from "lucide-react";
import {
  cancelRequestAction,
  getConnectionStateAction,
  sendConnectionAction,
  type ActionResult,
} from "@/lib/actions/connections";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import { sendLikeAction } from "@/lib/actions/likes";
import { notifyFailure, notifySuccess } from "@/components/ui/FailureToasts";
import { SHEET_BACKDROP, SHEET_PANEL_RELATIVE, SHEET_SHELL } from "@/components/ui/layers";
import type { ConnectionState } from "@/lib/feature/types";

/**
 * THE TWO BOTTOM-BAR ACTIONS ON A PUBLIC PROFILE — Chat and Follow.
 *
 * These live in their own file rather than inside `UserProfileView` so the view
 * stays a pure presentation component: everything that talks to the network
 * (the connection state machine, the first-message composer) is here.
 *
 * ── WHY NOT `ProfileConnectionActions` / `MessageProfileButton` ───────────────
 * Those two widgets were the first attempt at this same bar. They had ZERO
 * importers — the discover deck's detail sheet uses `ProfileDetailSheet` with
 * its own actions — so they were deleted rather than left to fork the data
 * path. What survives is the DATA PATH itself, which is the part that must
 * never fork:
 *
 *   • Follow → `getConnectionStateAction` / `sendConnectionAction` /
 *              `cancelRequestAction`. Same server actions the rest of the app
 *              uses, so entry points can never disagree about connection state.
 *   • Chat   → `sendFirstImpressionAction`. It is find-or-creates, so a thread
 *              started here is the same inbox row a message started from
 *              discover would create.
 *
 * There is no route that opens an EMPTY direct conversation, so Chat cannot
 * simply navigate to a thread: it opens a short composer, then routes straight
 * into the conversation it created. An empty thread would be a dead end.
 */


/**
 * "Skip the Line" modal — shown when the viewer is NOT matched with the
 * profile owner. Offers a 100-coin direct intro or a free like.
 */
function DirectIntroModal({
  recipientName,
  recipientId,
  isOpen,
  onClose,
  onIntroSent,
}: {
  recipientName: string;
  recipientId: string;
  isOpen: boolean;
  onClose: () => void;
  onIntroSent: (conversationId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"choice" | "sending" | "done">("choice");
  const name = recipientName.trim() || "this member";

  async function sendIntro() {
    setBusy(true);
    setStep("sending");
    try {
      const result = await sendFirstImpressionAction({ recipientId, body: "Hi! I'd love to connect." });
      if (!result.ok) {
        notifyFailure(result.error ?? "Couldn't send your intro. Please try again.");
        setStep("choice");
        return;
      }
      setStep("done");
      if (result.conversationId) {
        onIntroSent(result.conversationId);
      }
    } catch {
      notifyFailure("Couldn't send your intro. Check your connection and try again.");
      setStep("choice");
    } finally {
      setBusy(false);
    }
  }

  async function sendLike() {
    setBusy(true);
    try {
      const result = await sendLikeAction(recipientId);
      if (!result.ok) {
        notifyFailure(result.error ?? "Couldn't send your like. Please try again.");
        return;
      }
      notifySuccess("Like sent! If they like you back, you'll match and chat for free.");
      onClose();
    } catch {
      notifyFailure("Couldn't send your like. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className={SHEET_SHELL} role="dialog" aria-modal="true" aria-label="Skip the Line">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={SHEET_BACKDROP}
      />
      <div className={SHEET_PANEL_RELATIVE + " w-full max-w-sm rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6"}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-slate-900">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">Skip the Line ✨</h2>
            <p className="text-sm text-slate-500">
              Send a Direct Intro Message to <span className="font-medium">{name}</span> instantly.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {step === "choice" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={sendIntro}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-amber-400 bg-amber-400 text-slate-900 font-semibold text-sm transition hover:bg-amber-300 disabled:opacity-70 disabled:pointer-events-none"
            >
              <Coins className="h-4 w-4" aria-hidden />
              Send Intro — 100 Coins
            </button>
            <button
              type="button"
              onClick={sendLike}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-white/20 bg-slate-50 text-slate-700 font-semibold text-sm transition hover:bg-slate-100 disabled:opacity-70 disabled:pointer-events-none"
            >
              <Heart className="h-4 w-4" aria-hidden />
              Send Free Like
            </button>
          </div>
        ) : step === "sending" ? (
          <div className="flex flex-col items-center justify-center py-4">
            <AlertCircle className="h-6 w-6 animate-spin text-amber-400" aria-hidden />
            <p className="mt-2 text-sm text-slate-600">Sending your intro…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <Sparkles className="h-8 w-8 text-amber-400" aria-hidden />
            <p className="mt-2 text-sm font-medium text-slate-900">Intro sent!</p>
            <p className="text-xs text-slate-500">Opening your conversation…</p>
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * "Chat" — bright yellow, left half of the bottom bar.
 *
 * When matched, navigates straight into the conversation (free).
 * When not matched, opens the "Skip the Line" modal for a 100-coin direct
 * intro or a free like.
 */
export function ProfileChatButton({
  recipientId,
  recipientName,
  isMatch = false,
}: {
  recipientId: string;
  recipientName: string;
  /** True when the viewer and recipient have a mutual match (chat is free). */
  isMatch?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConversationId, setModalConversationId] = useState<string | null>(null);
  const name = recipientName.trim() || "this member";

  async function send() {
    const text = body.trim();
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
      if (result.conversationId) {
        router.push("/messages/" + result.conversationId as never);
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

  /** Matched path: find-or-create the conversation and go straight to the thread. */
  async function goToChat() {
    setBusy(true);
    try {
      const result = await sendFirstImpressionAction({ recipientId, body: "Hi!" });
      if (!result.ok) {
        if ((result.error as string | undefined)?.includes("coin")) {
          setModalOpen(true);
          return;
        }
        notifyFailure(result.error ?? "Couldn't open chat. Please try again.");
        return;
      }
      if (result.conversationId) {
        router.push("/messages/" + result.conversationId as never);
        router.refresh();
      } else {
        router.push("/messages" as never);
      }
    } catch {
      notifyFailure("Couldn't open chat. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }


  return (
    <>
      {isMatch ? (
        <button
          type="button"
          onClick={goToChat}
          disabled={busy}
          aria-label={"Chat with " + name}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 text-sm font-bold text-slate-900 transition hover:bg-amber-500 disabled:pointer-events-none disabled:opacity-70"
        >
          <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
          Chat
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label={"Send Direct Intro to " + name}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-slate-800 text-sm font-bold text-amber-400 transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-70"
          >
            <Sparkles className="h-[18px] w-[18px]" aria-hidden />
            Intro
          </button>
          {modalOpen && (
            <DirectIntroModal
              recipientName={name}
              recipientId={recipientId}
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              onIntroSent={(conversationId) => {
                setModalOpen(false);
                setModalConversationId(conversationId);
                router.push("/messages/" + conversationId as never);
                router.refresh();
              }}
            />
          )}
          {modalConversationId && (
            <DirectIntroModal
              recipientName={name}
              recipientId={recipientId}
              isOpen={false}
              onClose={() => setModalConversationId(null)}
              onIntroSent={() => {}}
            />
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={"Chat with " + name}
        className="hidden"
      />
      {open && (
        <div
          className={SHEET_SHELL}
          role="dialog"
          aria-modal="true"
          aria-label={"Chat with " + name}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className={SHEET_BACKDROP}
          />
          <div
            className={SHEET_PANEL_RELATIVE + " w-full max-w-sm rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-5"}
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
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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
                placeholder={"Say hello to " + name + "..."}
                maxLength={500}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-14 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={send}
                disabled={!body.trim() || busy}
                className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-xl text-amber-400 transition hover:bg-amber-400/10"
                aria-label="Send"
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
