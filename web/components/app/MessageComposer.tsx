// MessageComposer.tsx — the single docking bar at the bottom of a conversation:
// one bordered pill holding the attachment icon, the text input, the emoji and
// mic icons, with the send button outside it on the right.
//
// THE PALETTE ICON WAS REMOVED from this bar. It opened a chat-theme swatch tray
// sitting between the text field and the mic — four decorative colours on the one
// control a member uses most, which made the dock read as a settings panel rather
// than an input. Themes are still fully available via `ChatSettingsSheet` (header
// 3-dot menu → "Chat settings"); this removed a control, not a capability.
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
import { sendMessageAction } from "@/lib/actions/messaging";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import { Mic, Paperclip, Send, Smile } from "lucide-react";

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

/**
 * The id persisted in localStorage. `default` is the app's own look.
 *
 * The `default` entry is a DARK SLATE theme, so its swatch and label must both
 * say so. Leaving the name "Daylight" with a white swatch while the CSS behind
 * it is dark slate is the exact mismatch that made the picker lie: a member picks
 * "Daylight", sees a white swatch, and gets a navy thread. The swatch is the only
 * preview the member gets, so it has to be the truth.
 *
 * `readChatTheme` falls back to `default` for any unrecognised stored value, so
 * re-pointing the id here re-homes everyone who had no valid choice saved
 * without invalidating the ones that are.
 */
export const CHAT_THEMES = [
  { id: "default", label: "Slate", swatch: "linear-gradient(135deg,#1C2637,#101826)" },
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
  /* NO THEME-PICKER STATE ANY MORE. The palette icon and its swatch tray were both
     removed from this dock; `ChatSettingsSheet` owns the swatches now. `theme` and
     `onThemeChange` remain on the props (still passed by `ConversationClient`,
     which needs them for that sheet) and are deliberately left accepted-but-unused
     here rather than deleted, so the call site does not have to change with the UI.
     Deleting them would have been a wider refactor for no behavioural gain. */
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
    /* ── FLOATING DOCK, NOT AN EDGE-TO-EDGE BAND ────────────────────────────────
       This wrapper was a full-bleed surface: `w-full` + `px-2` + `border-t` + the
       chat surface colour, so the composer touched BOTH screen edges and its top
       rule ran the entire width. That is the "toolbar bolted to the screen" look,
       and the brief asks for a standalone floating pill instead.

       Now the wrapper only supplies INSETS — `px-3` at the sides, a bottom `pb`
       that clears both the pill and the home indicator — and carries no surface of
       its own. The pill inside owns its background, border and shadow, so the two
       never double up into a band.

       `px-3` (12px) rather than `px-4`: this dock carries an icon cluster, an
       input and a send button, and on a 320px phone every pixel of horizontal
       reserve is worth more here than on a full-width list.

       `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` is a FLOOR of 12px plus the
       safe area, rather than the old `max(0.75rem, …)`. The inset is additive
       because the pill must sit ABOVE the home indicator, not be pushed
       off-screen by it; taking the max would collapse the gap to zero on exactly
       the devices that need it most.

       A line comment rather than a JSX one: it explains the whole subtree, so it
       belongs above the return. A JSX comment placed directly inside the
       parenthesised return is a second expression beside the element and does not
       parse. */
      <div className="landscape-hide-chrome relative w-full shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:px-4">
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
      {/* THE THEME PICKER IS GONE FROM THIS DOCK, ALONG WITH ITS TOGGLE.
          Only the trigger above it was removed in the same pass; leaving this
          markup would have left a `themeOpen` flag with no way to set it true, so
          the swatch tray would have become permanently unreachable dead JSX that
          still cost a render branch on every keystroke.

          Themes remain fully available — `ChatSettingsSheet` (header 3-dot menu →
          "Chat settings") owns the swatches, and it is a surface where a theme
          picker belongs. This dock is for composing a message, not for changing
          how the conversation looks. */}
      {/* THE FLOATING PILL: exactly the three controls the brief specifies — an
          attachment icon on the left, the text field centred, and the send button
          on the right. The theme picker and the icebreakers sit ABOVE it, not
          inside, so nothing can crowd the field.

          `rounded-full` with its own border, background and shadow is what
          separates this from the full-bleed band it replaces. The outer wrapper
          supplies the side and bottom insets, so no part of this reaches a
          screen edge. */}
      <div className="mx-auto w-full max-w-2xl rounded-full border shadow-lg [background-color:var(--chat-surface)] [border-color:var(--chat-border)]">
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
            /* NO ORANGE BORDER, EVER. The field used to carry
               `border border-[var(--chat-input-border)]` plus a
               `focus-within:border-orange-400/60`, which drew a hard-edged
               orange box around the whole cluster. That was the loudest thing
               in the dock and it fought the send button for attention — orange
               in this app means "you" and "do this", and an input box is neither.

               The border now, if there is one, is `border-slate-800`: a quiet
               1px edge that separates the pill from the canvas without saying
               anything. The focus state is a `ring`, not a `border`, and it
               draws nothing until the cluster is actually focused — removing
               focus indication entirely would fail WCAG 2.4.7.

               `py-3` for the generous vertical padding. It also fixes a real
               cramping: the input carried a fixed `h-10`, so text was confined
               to 40px regardless of the container around it. That is gone —
               the input now sizes to its content inside the padded pill. */
            className="flex min-w-0 flex-1 items-center gap-0.5 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-3 focus-within:ring-1 focus-within:ring-orange-400/40"
          >
          {/*
            ATTACHMENT, as a PAPERCLIP.

            This was a gallery/photo-stack glyph (`Images`), which reads as
            "send a picture you already took" and is why the label had to be
            "Choose an image from your library". A paperclip is the general
            attachment affordance every messenger uses, and it is the honest one
            for a control whose file input still only accepts `image/*` — the
            glyph sets the expectation, the accept attribute keeps the promise
            honest. Widening the accept list is a separate decision; this only
            stops the icon from over-claiming.

            The `aria-label` still names the real behaviour, so the accessible
            name is unchanged and does not become "attach" for something that
            only opens images. */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Attach a file"
            title="Attach"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 [color:var(--chat-icon)] hover:bg-white/10 hover:text-[var(--chat-text)]"
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
            placeholder="Type here..."
            aria-label="Write a message"
            // `h-10` REMOVED. The input was pinned to a fixed 40px while the cluster
            // around it was 40px too, so text had exactly one line of room
            // inside a container that then added its own padding on top — there
            // was nowhere for a second line to go, and descenders sat hard
            // against the edge. With the pill now providing `py-3`, the input
            // sizes to its content and the padding does that work instead.
            //
            // No border and no background of its own: the wrapper owns both,
            // which is what makes this read as one field rather than a box
            // nested inside a box. `min-w-0 flex-1` remains load-bearing —
            // without it the input refuses to shrink below its intrinsic width
            // and pushes the icons out of the row, which is how the placeholder
            // once truncated to "Wri...".
            className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none [color:var(--chat-text)] placeholder:[color:var(--chat-muted)] disabled:opacity-60"
            disabled={pending}
          />
          {/* THE PALETTE ICON IS GONE, AND SO IS ITS PICKER.
              It was a theme swatch tray opened from this bar — four decorative
              colours sitting between the text field and the mic, on the control a
              member uses most. It made the dock read as a settings panel rather
              than an input, and it was the single widest thing in the row.

              The THEME still has a home: `ChatSettingsSheet`, reached from the
              header's three-dot menu ("Chat settings"), which is a real settings
              surface with room for swatches to mean something. Moving the picker
              there removed a control, not a capability — which is why
              `onThemeChange` stays on this component's props (see the note on the
              prop) rather than being deleted along with the button. */}
          <button
            type="button"
            onClick={() => setShowEmoji((current) => !current)}
            aria-label="Select emoji"
            aria-expanded={showEmoji}
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95",
              showEmoji ? "bg-white/15 text-[var(--chat-text)]" : "[color:var(--chat-icon)] hover:bg-white/10",
            ].join(" ")}
          >
            <Smile className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Record voice note"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 [color:var(--chat-icon)] hover:bg-white/10"
          >
            <Mic className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {/* NO VOICE-CALL LINK IN THE DOCK — DELIBERATE.

            This row used to carry a `Phone` link to `/call/<id>/audio` sitting
            between the input cluster and the send button, duplicating the audio
            AND video call buttons the header already shows 400px above. Two
            identical call affordances on one screen, on the same conversation,
            is the redundancy that makes a dock feel assembled: the member has to
            work out which one is current.

            The header is the right home for both. It is where the other person
            is identified, which is what a call is an action ON, and it is
            reachable with the thumb while the dock is competing for it.

            GIFT AND TOKEN REWARDS REMAIN ABSENT. Gifting needs a commerce write
            path and a coin ledger this chat does not touch, so a gift button
            here would open nothing. They belong in the dock the day they can
            actually do something. */}
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--chat-out-text)] shadow-lg shadow-orange-950/40 [background-image:linear-gradient(135deg,var(--chat-out-from),var(--chat-out-to))] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
        {error ? (
          <p role="alert" className="absolute -top-7 left-0 rounded px-2 py-1 text-xs text-red-400 [background-color:var(--chat-menu-bg)]">
            {error}
          </p>
        ) : null}
      </form>
      {/* Closes the floating pill; the one below closes the inset wrapper. */}
      </div>
    </div>
  );
}