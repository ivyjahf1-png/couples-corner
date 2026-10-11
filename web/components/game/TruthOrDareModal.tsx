"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Send, Shuffle, X } from "lucide-react";
import { notifyFailure, notifySuccess } from "@/components/ui/FailureToasts";
import { sendMessageAction } from "@/lib/actions/messaging";

/**
 * THE NATIVE TRUTH OR DARE / REAL FEELINGS EXPERIENCE.
 *
 * Event-driven like GameModal: `openTruthOrDare()` dispatches ONE custom
 * event, `TruthOrDareModalProvider` mounted once in the root layout listens
 * for it and renders the modal. Any surface opens it without prop drilling
 * across RSC boundaries.
 *
 * Animations are pure CSS (deal-in keyframe, swipe-away exits, stacked-deck
 * shadows) — framer-motion is not a repo dependency and every existing
 * animation ships as Tailwind transitions + keyframes.
 *
 * "Send to chat" posts the current prompt as a normal text message through
 * `sendMessageAction`, so it renders on every message surface with no new
 * message type, migration, or renderer to maintain.
 */

/** Event name for opening the Truth or Dare experience. */
export const OPEN_TRUTH_OR_DARE_EVENT = "couplescorner:open-truth-or-dare";

/** Prompt categories the swiper filters by. */
export type TruthOrDareCategory = "soft" | "spicy" | "deep";

interface TruthOrDarePrompt {
  category: TruthOrDareCategory;
  kind: "Truth" | "Dare" | "Feeling";
  text: string;
}

const CATEGORY_META: Record<TruthOrDareCategory, { label: string; emoji: string }> = {
  soft: { label: "Soft Flirting", emoji: "😊" },
  spicy: { label: "Spicy Dares", emoji: "🔥" },
  deep: { label: "Deep Questions", emoji: "💭" },
};

/** Curated, couple-safe prompt deck — static strings, so no fetch or offline failure mode. */
const PROMPT_DECK: readonly TruthOrDarePrompt[] = [
  { category: "soft", kind: "Truth", text: "What was your very first impression of me?" },
  { category: "soft", kind: "Truth", text: "What is one small thing I do that always makes you smile?" },
  { category: "soft", kind: "Dare", text: "Send me a voice note saying three things you adore about us." },
  { category: "soft", kind: "Dare", text: "Describe our perfect Sunday together in vivid detail." },
  { category: "soft", kind: "Feeling", text: "When do you feel most connected to me?" },
  { category: "soft", kind: "Feeling", text: "What song reminds you of us, and why?" },
  { category: "soft", kind: "Truth", text: "What is your favourite memory of us so far?" },
  { category: "soft", kind: "Dare", text: "Plan a surprise date night — tell me only the dress code." },
  { category: "spicy", kind: "Truth", text: "What is the boldest thing you have ever wanted to try with me?" },
  { category: "spicy", kind: "Dare", text: "Whisper your biggest fantasy for our next getaway." },
  { category: "spicy", kind: "Truth", text: "When do I drive you the wildest?" },
  { category: "spicy", kind: "Dare", text: "Plan a candle-lit evening with zero phones allowed." },
  { category: "spicy", kind: "Feeling", text: "What makes you feel most desired?" },
  { category: "spicy", kind: "Dare", text: "Send me one photo that captures your mood right now." },
  { category: "deep", kind: "Truth", text: "What is a fear you have never told anyone but me?" },
  { category: "deep", kind: "Feeling", text: "Where do you see us in five years?" },
  { category: "deep", kind: "Truth", text: "What is one thing you want us to be better at as a couple?" },
  { category: "deep", kind: "Feeling", text: "What does home feel like to you — and am I part of it?" },
  { category: "deep", kind: "Truth", text: "What is the hardest thing you have forgiven, and what did it teach you?" },
  { category: "deep", kind: "Dare", text: "Write me a letter about what our love means to you." },
];

/**
 * Open the Truth or Dare / Real Feelings experience from ANY client surface.
 * `conversationId` is optional: when present the modal offers "Send to chat".
 * No-ops outside the browser so a server-rendered call can never throw.
 */
export function openTruthOrDare(options?: { conversationId?: string; category?: TruthOrDareCategory }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_TRUTH_OR_DARE_EVENT, {
      detail: {
        conversationId: options?.conversationId ?? null,
        category: options?.category ?? null,
      },
    })
  );
}

function pickRandomIndex(length: number, exclude: number): number {
  if (length <= 1) return 0;
  let next = exclude;
  while (next === exclude) next = Math.floor(Math.random() * length);
  return next;
}
function TruthOrDareModal({
  initialCategory,
  conversationId,
  onClose,
}: {
  initialCategory: TruthOrDareCategory | null;
  conversationId: string | null;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<TruthOrDareCategory>(initialCategory ?? "soft");
  const [cardIndex, setCardIndex] = useState(() => Math.floor(Math.random() * PROMPT_DECK.length));
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [sending, setSending] = useState(false);

  const pile = PROMPT_DECK.filter((prompt) => prompt.category === category);
  const current: TruthOrDarePrompt = pile.length > 0 ? pile[cardIndex % pile.length]! : PROMPT_DECK[0]!;
  const meta = CATEGORY_META[category]!;

  function handleCategory(next: TruthOrDareCategory) {
    if (next === category) return;
    setCategory(next);
    const nextPile = PROMPT_DECK.filter((prompt) => prompt.category === next);
    setCardIndex(Math.floor(Math.random() * Math.max(nextPile.length, 1)));
    setSwipeDirection(null);
  }

  function handleNext(direction: "left" | "right") {
    setSwipeDirection(direction);
    window.setTimeout(() => {
      setCardIndex((prev) => prev + 1 + Math.floor(Math.random() * 3));
      setSwipeDirection(null);
    }, 180);
  }

  const handleShuffle = useCallback(() => {
    handleNext(Math.random() > 0.5 ? "left" : "right");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function handleSendToChat() {
    if (!conversationId || sending) return;
    setSending(true);
    try {
      const result = await sendMessageAction({
        conversationId,
        body: `💌 ${current.kind}: ${current.text}`,
      });
      if (result.ok) {
        notifySuccess("Prompt sent to chat");
      } else {
        notifyFailure(result.error ?? "Couldn't send the prompt.");
      }
    } catch {
      notifyFailure("Couldn't send the prompt. Please try again.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") handleNext("right");
      if (event.key === "ArrowLeft") handleNext("left");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Truth or Dare"
      onClick={onClose}
    >
      <style>{`
        @keyframes tod-deal-in { from { opacity: 0; transform: translateY(24px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes tod-exit-left { to { opacity: 0; transform: translateX(-120px) rotate(-8deg); } }
        @keyframes tod-exit-right { to { opacity: 0; transform: translateX(120px) rotate(8deg); } }
        .tod-card-enter { animation: tod-deal-in .28s cubic-bezier(.22,1,.36,1) both; }
        .tod-exit-left { animation: tod-exit-left .18s ease-in both; }
        .tod-exit-right { animation: tod-exit-right .18s ease-in both; }
      `}</style>
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-rose-400/30 bg-gradient-to-b from-[#1E1025] to-[#0B1120] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-300">Flirting and Icebreakers</p>
            <h2 className="text-lg font-bold text-white">Truth or Dare</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Truth or Dare"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 px-5 pt-4" role="tablist" aria-label="Prompt categories">
          {(Object.keys(CATEGORY_META) as TruthOrDareCategory[]).map((key) => {
            const active = key === category;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleCategory(key)}
                className={[
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-xs font-semibold transition",
                  active
                    ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white",
                ].join(" ")}
              >
                <span aria-hidden="true">{CATEGORY_META[key]!.emoji}</span>
                {CATEGORY_META[key]!.label}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-5">
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-x-4 top-2 h-full rounded-3xl bg-rose-500/10" />
            <div aria-hidden="true" className="absolute inset-x-2 top-1 h-full rounded-3xl bg-rose-500/15" />
            <div
              key={`${category}-${cardIndex}`}
              className={[
                "relative flex min-h-56 flex-col justify-between rounded-3xl border border-rose-300/30 bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 p-6 text-white shadow-xl",
                swipeDirection === "left" ? "tod-exit-left" : swipeDirection === "right" ? "tod-exit-right" : "tod-card-enter",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                  {current.kind}
                </span>
                <span className="text-[11px] font-medium text-white/80">
                  {meta.emoji} {meta.label}
                </span>
              </div>
              <p className="py-6 text-center text-xl font-semibold leading-relaxed">{current.text}</p>
              <p className="text-center text-[11px] text-white/70">Deal the next card below</p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleNext("left")}
              aria-label="Skip this card"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl transition hover:scale-105 hover:bg-white/10 active:scale-95"
            >
              <span aria-hidden="true">Skip</span>
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              aria-label="Shuffle to a random card"
              className="flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 text-sm font-bold text-white shadow-lg transition hover:scale-105 active:scale-95"
            >
              <Shuffle className="h-4 w-4" />
              Next card
            </button>
            <button
              type="button"
              onClick={() => handleNext("right")}
              aria-label="Deal the next card"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl transition hover:scale-105 hover:bg-white/10 active:scale-95"
            >
              <span aria-hidden="true">Next</span>
            </button>
          </div>
          {conversationId ? (
            <button
              type="button"
              onClick={handleSendToChat}
              disabled={sending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/40 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-60"
            >
              {sending ? "Sending…" : (<><Send className="h-4 w-4" />Send this prompt to chat</>)}
            </button>
          ) : (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
              <Heart className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
              Open this from a chat to send prompts to your match.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Root-layout provider. Renders null until `openTruthOrDare()` fires.
 */
export function TruthOrDareModalProvider() {
  const [open, setOpen] = useState<{ conversationId: string | null; category: TruthOrDareCategory | null } | null>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ conversationId?: string | null; category?: TruthOrDareCategory | null }>).detail;
      const category = detail?.category;
      setOpen({
        conversationId: detail?.conversationId ?? null,
        category: category === "soft" || category === "spicy" || category === "deep" ? category : null,
      });
    }
    window.addEventListener(OPEN_TRUTH_OR_DARE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TRUTH_OR_DARE_EVENT, onOpen);
  }, []);

  const close = useCallback(() => setOpen(null), []);

  if (open === null) return null;
  return <TruthOrDareModal initialCategory={open.category} conversationId={open.conversationId} onClose={close} />;
}

