// MessageComposer.tsx — the single docking bar at the bottom of a conversation:
// one bordered field holding the attachment icon, the text input, and the
// emoji/theme/mic icons, with the send button outside it on the right.
//
// It was previously TWO stacked rows — an AttachmentDock of labelled pills
// (Gallery / Camera / Theme) above a separate control row — which duplicated the
// attachment controls in both places and squeezed the input to "Wri..." on a
// 320px phone. Everything from the deleted dock now lives in the one field.
//
// GIFTS AND TOKEN REWARDS ARE DELIBERATELY ABSENT. Both were in the original spec.
// Neither renders, because neither has a real implementation: gifting needs a
// commerce write path and token rewards need a ledger this chat does not touch. A
// button that opens nothing teaches a member the dock is decorative. They belong
// here the day they can actually do something.
"use client";

import { useEffect, useState, useRef } from "react";
import { useTransition } from "react";
import Link from "next/link";
import { sendMessageAction } from "@/lib/actions/messaging";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import { Images, Mic, Palette, Phone, Send, Smile } from "lucide-react";

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
  { id: "default", label: "Daylight", swatch: "linear-gradient(135deg,#F7F7F8,#FFFFFF)" },
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
  /* Theme picker disclosure. This state used to live inside `AttachmentDock`,
     which was deleted; the picker itself moved into the single dock bar as a
     palette icon, so the flag moved here with it. */
  const [themeOpen, setThemeOpen] = useState(false);
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
    /* ── ONE DOCKING BAR ──────────────────────────────────────────────────────
       This dock used to stack TWO control rows above the input:

         row 1: AttachmentDock -> Gallery, Camera, Theme  (text pills)
         row 2: the form -> Paperclip, input, Camera, Emoji, Mic, Call, Send

       Two consequences, both reported:

         • "Gallery" / "Camera" / "Theme" clashed with the form's own attachment
           icons. Gallery and Camera were each rendered TWICE — once as a labelled
           pill up here, once as a bare icon down there — and Camera appears in
           both rows. The same control in two places at once reads as two
           different controls.
         • The input was squeezed to "Wri...". Six `h-11` controls plus a pill row
           inside a `max-w-2xl` flex leaves the `flex-1` input whatever is left,
           which on a 320px phone is four characters.

       So AttachmentDock is GONE as a separate row. Everything it uniquely offered
       is folded into the single form row below as ICON-ONLY buttons: Gallery
       (Images) and Theme (Palette). Camera was already there.

       Icon-only rather than labelled pills: labels are what made the first row
       wide enough to force the truncation. Each control keeps an `aria-label`, so
       the accessible name is unchanged — only the visual density drops.

       The icebreaker row below is retained on its own line. Those are CONTENT
       (suggested openers), not chrome, and they only render on an empty thread,
       so they never compete with the input for width the way controls did. */
    <div className="landscape-hide-chrome relative w-full shrink-0 border-t px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:px-3 [background-color:var(--chat-surface)] [border-color:var(--chat-border)]">
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
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 [background-color:var(--chat-pill-bg)] [border-color:var(--chat-pill-border)] [color:var(--chat-pill-text)] hover:brightness-[1.03]"
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
              className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 [background-color:var(--chat-next-bg)] [border-color:var(--chat-next-bg)] [color:var(--chat-next-text)] hover:opacity-90"
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
      {themeOpen && onThemeChange ? (
        /* The theme picker, moved from the deleted AttachmentDock. Same
           horizontal scroller of swatches, now anchored above the single dock bar
           so it floats over the thread instead of occupying a row of its own.

           It now CLOSES on selection. The old picker left itself open after a
           choice, so a row of swatches sat above the input on every subsequent
           message until the member thought to dismiss it. */
        <div
          className="mx-auto mb-2 flex w-full max-w-2xl items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Chat theme"
        >
          {CHAT_THEMES.map((option) => {
            const selected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                aria-label={option.label}
                onClick={() => {
                  onThemeChange(option.id);
                  setThemeOpen(false);
                }}
                className={[
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  "[background-color:var(--chat-in-bg)] [border-color:var(--chat-border)]",
                  selected
                    ? "border-orange-400/60 text-[var(--chat-text)]"
                    : "text-[var(--chat-muted)]",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full ring-1 ring-white/25"
                  style={{ background: option.swatch }}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-2xl items-center gap-2"
        aria-label="Send a message"
      >
        {/* ONE CONTROL CLUSTER, ICON ONLY.

            Every secondary control shares a single class string so they cannot
            drift apart again, and none of them carries a text label — labels are
            what made the old two-row dock wide enough to truncate the input.

            A single bordered "field" wraps the icon cluster and the input so they
            read as ONE control rather than as loose buttons floating beside a
            text box. That is the standard messenger affordance and it is what
            removes the "assembled rather than designed" look.

            The send button sits OUTSIDE that field, on the right, because it is a
            different kind of action (commit, not compose) and giving it its own
            solid orange fill is what makes it instantly findable. */}
        {/* The hidden file input. KEPT in the DOM and out of the layout rather
              than removed: it is the target of the Gallery button, and this is a
              plain click-driven picker inside a chat (not the iOS sheet picker in
              FeedUploadModal), so a programmatic click from a real user gesture
              is fine here. `hidden` is safe because the button is a real on-screen
              control that was definitely painted. */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Choose an image"
          />
          <div
            className="flex min-w-0 flex-1 items-center gap-0.5 rounded-full border px-1.5 [background-color:var(--chat-input-bg)] [border-color:var(--chat-input-border)] focus-within:border-orange-400/60"
          >
          {/* GALLERY, from the old AttachmentDock. Icon-only now; it keeps the
              same `aria-label`, so the accessible name is unchanged. */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Choose an image from your library"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 [color:var(--chat-icon)] hover:bg-black/5 hover:text-[var(--chat-text)]"
          >
            <Images className="h-5 w-5" aria-hidden />
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
            placeholder="Write a message…"
            aria-label="Write a message"
            // No border and no background of its own: the wrapper above owns both,
            // which is what makes this read as one field rather than a box nested
            // inside a box. `min-w-0 flex-1` is load-bearing — without it the input
            // refuses to shrink below its intrinsic size and pushes the icons out
            // of the row, which is how the placeholder ended up clipped to "Wri...".
            className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none [color:var(--chat-text)] placeholder:[color:var(--chat-muted)] disabled:opacity-60"
            disabled={pending}
          />
          {/* THEME, from the old AttachmentDock. A palette icon rather than a
              labelled pill; `aria-expanded` is retained so the disclosure state is
              still announced. */}
          {onThemeChange ? (
            <button
              type="button"
              onClick={() => setThemeOpen((v) => !v)}
              aria-expanded={themeOpen}
              aria-label="Change chat theme"
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95",
                themeOpen ? "bg-orange-500/20" : "[color:var(--chat-icon)] hover:bg-black/5",
              ].join(" ")}
            >
              <Palette className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowEmoji((current) => !current)}
            aria-label="Select emoji"
            aria-expanded={showEmoji}
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95",
              showEmoji ? "bg-black/10 text-[var(--chat-text)]" : "[color:var(--chat-icon)] hover:bg-black/5",
            ].join(" ")}
          >
            <Smile className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Record voice note"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 [color:var(--chat-icon)] hover:bg-black/5"
          >
            <Mic className="h-5 w-5" aria-hidden />
          </button>
        </div>
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 [color:var(--chat-icon)] hover:bg-emerald-500/15 hover:text-emerald-600"
        >
          <Phone className="h-5 w-5" aria-hidden />
        </Link>
        {showEmoji ? (
          <div className="absolute bottom-16 left-20 z-10 flex gap-1 rounded-xl border p-2 shadow-xl [background-color:var(--chat-menu-bg)] [border-color:var(--chat-menu-border)]">
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setValue((current) => `${current}${emoji}`);
                  setShowEmoji(false);
                  inputRef.current?.focus();
                }}
                className="rounded-lg p-1 text-xl hover:bg-black/5"
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
          <p role="alert" className="absolute -top-7 left-0 rounded px-2 py-1 text-xs text-red-600 [background-color:var(--chat-menu-bg)]">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}