// MessageComposer.tsx — messenger-style bottom bar: plus button, dark pill
// input ("Write a message"), circular send button. Sends via the existing
// sendMessageAction server action; no Supabase linkage changes.
"use client";

import { useEffect, useState, useRef } from "react";
import { useTransition } from "react";
import Link from "next/link";
import { sendMessageAction } from "@/lib/actions/messaging";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import { Camera, Images, Mic, Palette, Paperclip, Phone, Send, Smile } from "lucide-react";

/**
 * The attachment dock + theme picker that sits above the composer input.
 *
 * ── WHY GIFTS AND TOKEN REWARDS ARE ABSENT ──────────────────────────────────
 * Both were in the original spec for this dock. Neither is rendered, because
 * neither has a real implementation behind it: gifting needs a commerce write
 * path and token rewards need a ledger this chat does not touch. A button that
 * opens nothing is worse than no button — it teaches a member that this dock is
 * decorative, and once the real controls stop being trusted either. They belong
 * here the day they can actually do something; see the commerce module.
 *
 * Everything present IS wired. "Gallery" and "Camera" both open the same file
 * input on purpose: a `capture` attribute would force the camera on mobile and
 * make Gallery unreachable, so the two labels are honest about sharing a picker
 * rather than pretending to be separate flows.
 */
function AttachmentDock({
  onPickImage,
  theme,
  onThemeChange,
}: {
  onPickImage: () => void;
  theme?: ChatThemeId;
  onThemeChange?: (theme: ChatThemeId) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <div className="flex w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DockButton onClick={onPickImage} icon={Images} label="Gallery" />
        <DockButton onClick={onPickImage} icon={Camera} label="Camera" />
        {/* The picker only mounts when a change handler exists, so the control
            cannot appear and do nothing in a caller that does not support it. */}
        {onThemeChange ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={[
              "ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95",
              open
                ? "bg-orange-500/20 text-orange-100"
                : "bg-white/[0.06] text-ink-200 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Palette className="h-4 w-4" aria-hidden />
            Theme
          </button>
        ) : null}
      </div>

      {open && onThemeChange ? (
        <div
          className="mt-1.5 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Chat theme"
        >
          {CHAT_THEMES.map((option) => {
            const selected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onThemeChange(option.id)}
                aria-pressed={selected}
                className={[
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  selected
                    ? "border-orange-400/70 bg-orange-500/15 text-white"
                    : "border-white/10 bg-white/[0.04] text-ink-300 hover:border-white/25 hover:text-white",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full ring-1 ring-white/25"
                  style={{ backgroundImage: option.swatch }}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DockButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: typeof Images;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-ink-200 transition hover:bg-white/10 hover:text-white active:scale-95"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

/**
 * Owns the chat theme and hands it to the thread.
 *
 * The theme lives in a HOOK rather than inside the composer because it has to
 * tint the whole thread surface — background and bubbles — not just the input
 * bar. A picker that only recoloured its own controls would be a setting with
 * nothing to show for it. The composer takes the value and setter as props, so
 * the picker and the background can never disagree about which theme is active.
 *
 * The state is seeded with `default` and corrected in an effect rather than
 * reading `localStorage` during render: on the server there is no storage, so a
 * lazy initialiser would produce a value the client immediately disagreed with,
 * and React would warn about a hydration mismatch on the background.
 */
export function useChatTheme(): {
  theme: ChatThemeId;
  setTheme: (next: ChatThemeId) => void;
} {
  const [theme, setThemeState] = useState<ChatThemeId>("default");

  useEffect(() => {
    setThemeState(readChatTheme());
  }, []);

  return {
    theme,
    setTheme: (next: ChatThemeId) => {
      setThemeState(next);
      writeChatTheme(next);
    },
  };
}
const QUICK_EMOJI = ["❤️", "✨", "😂", "👍"] as const;

/**
 * Icebreaker pills.
 *
 * These are OPENERS, not claims: each is a question or a greeting that invites a
 * reply and asserts nothing about the other person. That matters because the
 * messages this app exists to carry are read by strangers — a pill that
 * complimented someone's appearance or assumed a shared interest would be
 * inventing a relationship the two people do not have.
 *
 * They are suggestions, not autofill: tapping one fills the composer and the
 * member can edit before sending. Autocomplete is exactly the wrong pattern
 * here, since a sent message cannot be unsent.
 *
 * Shown as a WINDOW of three at a time, advanced by the "Next" button, rather
 * than all at once. Four short pills plus a Next control do not fit across a
 * 320px phone without the row truncating, and a horizontally scrolling strip
 * hides most of them behind a swipe nobody makes.
 */
const ALL_ICEBREAKERS = [
  "Where are you from?",
  "How are you?",
  "Good to meet you",
  "What are you up to today?",
  "What's something you love doing?",
  "How's your week going?",
] as const;

/** How many pills are visible before the "Next" button advances the window. */
const ICEBREAKER_WINDOW = 3;

/**
 * Chat theme customisation.
 *
 * Themes are pure presentation and are stored per-device in `localStorage`. No
 * account row, no migration, no server call — a member can change the look of
 * their own conversation without any of that, and nothing they pick is ever
 * shown to the other person. That asymmetry is deliberate: this is a comfort
 * setting for reading a conversation, not a shared signal.
 *
 * Every theme is expressed as a CSS class on the thread's root, never as an
 * inline style, so the values live in one stylesheet and can be themed centrally
 * later. The data below is only the label and the swatch used by the picker.
 */

/** The id persisted in localStorage. `default` is the app's own look. */
export const CHAT_THEMES = [
  { id: "default", label: "Midnight", swatch: "linear-gradient(135deg,#0F172A,#1E293B)" },
  { id: "dusk", label: "Dusk", swatch: "linear-gradient(135deg,#2E1B3F,#4C2A5E)" },
  { id: "ocean", label: "Ocean", swatch: "linear-gradient(135deg,#0B2B3A,#124A5E)" },
  { id: "ember", label: "Ember", swatch: "linear-gradient(135deg,#3A1A10,#5C2A18)" },
  { id: "rose", label: "Rose", swatch: "linear-gradient(135deg,#3B1220,#5E1A33)" },
] as const;

export type ChatThemeId = (typeof CHAT_THEMES)[number]["id"];

const STORAGE_KEY = "couples_corner:chat-theme";

/**
 * Read the stored theme, tolerating a corrupt or absent value.
 *
 * Returns `default` rather than trusting the raw string: `localStorage` is
 * user-writable and survives deploys, so a stale id from a removed theme must
 * degrade to the default look rather than render an unstyled thread.
 */
export function readChatTheme(): ChatThemeId {
  if (typeof window === "undefined") return "default";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const match = CHAT_THEMES.find((theme) => theme.id === raw);
    return match ? match.id : "default";
  } catch {
    // Private-mode Safari and locked-down browsers throw on access. A missing
    // theme preference is not worth failing a conversation over.
    return "default";
  }
}

export function writeChatTheme(theme: ChatThemeId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Non-fatal: the theme still applies for this session.
  }
}

/**
 * Bottom message toolbar.
 *
 * FLUSH CONTROL ROW: every control is a square `h-11 w-11` with `shrink-0`, so
 * the attach, image, emoji and mic buttons all sit on one optical line and the
 * input is the only element that flexes. The previous row mixed a bordered
 * `h-10 w-10` plus button, a `h-9 w-9` text button, a `h-9 w-9` emoji button, a
 * bordered `h-9 w-9` mic and an `h-10 w-10` send — five different sizes and
 * three different surface treatments, which is what made the bar look assembled
 * rather than designed. One size, one treatment, one baseline.
 *
 * The glyphs were emoji (▧, ☺, 🎙), which render at different intrinsic sizes
 * and baselines per platform; Lucide line icons share one 24px grid, so the row
 * stays square on every OS.
 *
 * The send button now uses the same orange brand accent as the sent bubbles, so
 * "what I send" and "what I press to send" are the same colour.
 */
export function MessageComposer({
  conversationId,
  showIcebreakers = false,
  theme,
  onThemeChange,
}: {
  conversationId: string;
  /**
   * Whether to offer the icebreaker pills.
   *
   * Off by default and driven by the THREAD, not the user: the pills exist to
   * solve "what do I say first", which is only a real problem in a conversation
   * that has not started. Showing them under an existing exchange reads as the
   * app pushing the member to repeat an opener they have already moved past.
   */
  showIcebreakers?: boolean;
  /** The active theme, owned by the thread so the whole surface stays in sync. */
  theme?: ChatThemeId;
  onThemeChange?: (theme: ChatThemeId) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, reportError] = useActionError();
  const [showEmoji, setShowEmoji] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Which window of icebreakers is showing. `0` on mount: a member who has just
  // opened a thread should see the same openers every time, not a random slice.
  const [icebreakerStart, setIcebreakerStart] = useState(0);
  const icebreakers = ALL_ICEBREAKERS.slice(
    icebreakerStart,
    icebreakerStart + ICEBREAKER_WINDOW,
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = value.trim();
    if (!body || pending) return;

    startTransition(async () => {
      reportError(null);
      const result = await sendMessageAction({ conversationId, body });
      if (!result.ok) {
        reportError(failureMessage(
          result.error ?? "Couldn't send your message",
          result.error ?? "Your message didn't go through. Please try again.",
        ));
        return;
      }
      setValue("");
      inputRef.current?.focus();
    });
  };

  /** Apply a pill to the composer WITHOUT sending it. See ICEBREAKERS. */
  function applyIcebreaker(phrase: string) {
    setValue(phrase);
    inputRef.current?.focus();
  }

  return (
    // Pinned to the bottom of the page's 100dvh column: the bar itself is
    // `shrink-0` (the page wrapper enforces it) and owns the safe-area inset,
    // because the bottom tab nav is hidden inside an active conversation and
    // nothing below this composer applies the iPhone home-indicator clearance.
    //
    // The control row never wraps: every button is `shrink-0` and sized down
    // (not hidden) at the smallest breakpoint, so +, camera, input, emoji and
    // mic all fit side by side on a 320px-wide phone.
    <div className="landscape-hide-chrome relative w-full shrink-0 border-t border-white/10 bg-slate-950/90 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:px-3">
      {/* Dock, theme picker and icebreakers all sit ABOVE the input row rather
          than beside it: that row is already at its width limit on a 320px
          phone, so a second horizontal row of actions beside the input was never
          going to fit. Stacking keeps every existing control reachable. */}
      <AttachmentDock
        onPickImage={() => imageInputRef.current?.click()}
        theme={theme}
        onThemeChange={onThemeChange}
      />
      {showIcebreakers ? (
        /* `overflow-x-auto` is retained here deliberately. Unlike the photo
           strip on the intro card, this row is not inside the thread's vertical
           scroll region — it is inside the composer dock, which never scrolls —
           so a horizontal scroller adds no nested axis. It is the only way a
           320px phone can show long openers legibly, and the pills remain
           reachable by keyboard and screen reader. */
        <div
          className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Conversation starters"
        >
          {icebreakers.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => {
                // Fills the composer; does NOT send. A sent message cannot be
                // unsent, so an opener the member did not mean to send would be
                // worse than no opener at all.
                setValue(phrase);
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-ink-200 transition hover:border-orange-400/50 hover:bg-orange-500/10 hover:text-white active:scale-95"
            >
              {phrase}
            </button>
          ))}

          {/* "Next" advances to the next window of openers.
              HIDDEN once the final window is showing: with nothing left to
              advance to, a button that does nothing is worse than no button.
              The bound is an exact `start + WINDOW` check rather than a modulo
              wrap, so the row never silently restarts at the first opener. */}
          {icebreakerStart + ICEBREAKER_WINDOW < ALL_ICEBREAKERS.length ? (
            <button
              type="button"
              onClick={() => setIcebreakerStart((s) => s + ICEBREAKER_WINDOW)}
              aria-label="Show more conversation starters"
              className="flex shrink-0 items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/10 px-2.5 py-1.5 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20 hover:text-orange-100 active:scale-95"
            >
              Next
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
                aria-hidden
              >
                <path d="M9 5 L16 12 L9 19" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-2xl items-center gap-1 sm:gap-1.5 lg:gap-2"
        aria-label="Send a message"
      >
        {/* Shared treatment for every secondary control. One class string for
            all four so they cannot drift apart again. */}
        <button
          type="button"
          aria-label="More actions"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Paperclip className="h-5 w-5" aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Write a message"
          aria-label="Write a message"
          // `h-11` matches the controls, and the focus ring uses the same orange
          // accent as the send button so focus and action read as one system.
          className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white placeholder:text-ink-400 outline-none transition-colors focus:border-orange-400/60 focus:bg-white/[0.09] disabled:opacity-60"
          disabled={pending}
        />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" aria-label="Choose an image" />
        {/* Camera/attach. Visible at every breakpoint: with the tab bar hidden
            inside a chat there is room for all five controls on a phone, and
            `shrink-0` guarantees they never compress or wrap. */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          aria-label="Choose image"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Camera className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setShowEmoji((current) => !current)}
          aria-label="Select emoji"
          aria-expanded={showEmoji}
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95",
            showEmoji ? "bg-white/15 text-white" : "text-ink-300 hover:bg-white/10 hover:text-white",
          ].join(" ")}
        >
          <Smile className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Record voice note"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Mic className="h-5 w-5" aria-hidden />
        </button>
        {/* Voice call. Same `h-11 w-11` square and the same ghost treatment as
            every other secondary control, so the row keeps its one optical line.

            A REAL destination, not a stub: `/call/[conversationId]/[mode]` is
            implemented in the `(realtime)` group and drives the actual WebRTC
            screen. It is placed last in the control run so the send button stays
            the rightmost, most reachable control on a phone — a call is a
            bigger, rarer action than sending the next message.

            GIFT IS DELIBERATELY ABSENT. See the note on `AttachmentDock` at the
            top of this file: gifting needs a commerce write path and a coin
            ledger this chat does not touch, so a gift button here would open
            nothing. It belongs in the dock the day it can actually send
            something. */}
        <Link
          href={`/call/${conversationId}/audio`}
          aria-label="Start a voice call"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-300 transition hover:bg-emerald-400/15 hover:text-emerald-300 active:scale-95"
        >
          <Phone className="h-5 w-5" aria-hidden />
        </Link>
        {showEmoji ? (
          <div className="absolute bottom-16 left-20 z-10 flex gap-1 rounded-xl border border-white/10 bg-[#1E293B] p-2 shadow-xl">
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setValue((current) => `${current}${emoji}`);
                  setShowEmoji(false);
                  inputRef.current?.focus();
                }}
                className="rounded-lg p-1 text-xl hover:bg-white/10"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
        {/* Circular send button. Shares the sent-bubble orange so the action and
            its result are unmistakably the same colour. */}
        <button
          type="submit"
          aria-label="Send message"
          disabled={pending || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-950/40 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
        {error ? (
          <p role="alert" className="absolute -top-7 left-0 rounded bg-slate-900 px-2 py-1 text-xs text-red-400">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}