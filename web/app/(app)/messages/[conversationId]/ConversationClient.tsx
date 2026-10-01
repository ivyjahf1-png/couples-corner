"use client";

import { useEffect, useState } from "react";
import { ChatHeader } from "@/components/app/ChatHeader";
import { markConversationReadAction } from "@/lib/actions/messaging";
import { LiveConversationThread } from "@/components/app/LiveConversationThread";
import { MatchIntroCard } from "@/components/app/MatchIntroCard";
import { useChatWallpaper } from "@/lib/hooks/useChatWallpaper";
import { ChatSettingsSheet } from "@/components/app/ChatSettingsSheet";
import { MessageComposer, useChatTheme } from "@/components/app/MessageComposer";
import { usePresence } from "@/lib/hooks/usePresence";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

/**
 * Client wrapper for the conversation surface.
 *
 * It exists for the THEME, which is a per-device preference read from
 * `localStorage`. The server component resolves the data; this owns the one
 * piece of state that cannot be known on the server, without making the whole
 * route dynamic for a cosmetic setting.
 *
 * IT RENDERS THE HEADER AND THREAD ITSELF rather than receiving them as
 * `children`. That is deliberate: the theme class sits on the root, and a
 * server-rendered child could not be wrapped in the themed surface without
 * either losing the theming or reintroducing a second scroll container. The data
 * crosses the boundary as plain props either way — the difference is only WHERE
 * the elements are created.
 *
 * ── LAYOUT CONTRACT (three fixed bands, one scroller) ──────────────────────────
 *
 *   root        h-[100dvh] flex-col overflow-hidden      viewport is locked
 *     header    shrink-0                                 fixed at the top
 *     thread    flex-1 overflow-y-auto                  the ONLY scroller
 *     composer  shrink-0                                 fixed at the bottom
 *
 * The page never scrolls; only the thread does. This is also why the app shell
 * drops its `<main>` padding on this route (see `AppMain`) and why
 * `BottomNavRegion` hides the tab bar here — otherwise the composer would sit
 * under a nav the thread's column never reserved room for.
 *
 * `LiveConversationThread`'s `<ul>` must stay non-scrolling (overflow-x-hidden
 * only). Two nested `overflow-y-auto` containers cause scroll chaining and the
 * erratic bouncing this page used to have.
 *
 * ── WHAT THE INTRO CARD COST, AND WHY IT IS BACK ─────────────────────────────
 * This used to render a full `ConversationSummaryCard` between the header and
 * the first message: an avatar, identity chips, badges, a photo strip, an
 * interests grid and a disclosure toggle, opening EXPANDED. It was removed.
 *
 * It was a second profile banner directly beneath the header, restating the
 * name and avatar the header 4px above it already showed. On a 320px phone it
 * left almost no room for the messages it was describing, and the member had to
 * scroll past a stranger's photo grid to read "hi". The header carries the
 * identity now; the thread carries the conversation.
 *
 * It is back as `MatchIntroCard`, and the fix for all of the above is ONE
 * WORD: collapsed. The old card was removed for taking up space it did not need
 * to take — not for existing. A single 32px line, expanded on tap, costs a
 * member nothing until they ask for it, and answers "who am I talking to" in
 * place of a tap through to the profile.
 *
 * It still carries NO compatibility percentage. `personalitySimilarity` was
 * hardcoded to 78 and rendered as "78% match" — a fabricated score about a real
 * person. See the note in lib/actions/messaging.ts.
 */
export default function ConversationClient({
  conversationId,
  currentUserId,
  summary,
  initialMessages,
  initialOnline = false,
  initialCalls = [],
}: {
  conversationId: string;
  currentUserId: string;
  summary: ConversationParticipantSummary | null;
  /**
   * Inferred from `LiveConversationThread` rather than re-declared: the `Message`
   * interface is local to that file, and copying its shape here would be a
   * second definition free to drift out of step with the first.
   */
  initialMessages: NonNullable<
    React.ComponentProps<typeof LiveConversationThread>["initialMessages"]
  >;
  initialOnline: boolean;
  /**
   * Call history for the timeline, merged with messages by start time.
   * Defaults to none, so a caller that does not supply it renders exactly the
   * message thread it always did.
   */
  initialCalls?: NonNullable<
    React.ComponentProps<typeof LiveConversationThread>["calls"]
  >;
}) {
  const { theme, setTheme } = useChatTheme();

  /* Mark the thread read, ONCE, after the view has mounted.

     This used to be fired from the server page's render. That was wrong twice
     over and crashed the app on opening any conversation:

       • `markConversationReadAction` calls `revalidatePath`, and Next.js only
         permits that inside a Server Action or Route Handler invoked as a
         MUTATION. From a render pass it throws "Route /messages/... used
         `revalidatePath` ... during render which is unsupported".
       • A render must be side-effect free. Writing `read_at` from one is a write
         React can perform on its own, with no member action behind it.

     A mount effect is the right home for it: it runs after commit, in response
     to the member actually opening the thread, and a Server Action called from
     the client is exactly the mutation context `revalidatePath` expects.

     `conversationId` is the only dependency, so switching threads re-marks and
     re-rendering for any other reason does not. `void` keeps the rejection from
     becoming an unhandled promise rejection if the write fails — failing to
     clear a badge is not worth taking the conversation down for. */
  useEffect(() => {
    void markConversationReadAction(conversationId);
  }, [conversationId]);

  // Icebreakers only make sense on a thread that has not started. Derived from
  // the message list rather than a server flag, so it stays correct as messages
  // arrive live.
  const showIcebreakers = initialMessages.length === 0;

  // Live presence, seeded by the server so the first frame is already correct.
  const otherId = summary?.id ?? null;
  const { presence } = usePresence(otherId ? [otherId] : [], Boolean(otherId));
  const online = otherId
    ? presence[otherId]
      ? presence[otherId].online
      : initialOnline
    : initialOnline;

  const { wallpaper, setWallpaper } = useChatWallpaper();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className={`chat-theme-${theme} relative flex h-[100dvh] w-full flex-col overflow-hidden`}
      data-chat-theme={theme}
    >
      {/* Custom wallpaper, painted UNDER the thread rather than behind the text.

          THE TWO SCRIMS ARE THE POINT. This covers the whole column and draws,
          back to front: the image, a theme-tinted wash, then a near-opaque
          scrim. Message text reads against the SCRIM, not the photo, which is
          the only reason a member can pick a bright sunset without making the
          conversation unreadable. The image is allowed to be washed out; the
          text is not.

          Absolutely positioned and -z-10 so it cannot intercept taps meant for
          the thread, and it renders nothing when there is no wallpaper — so an
          untouched theme gets no extra paint layer and no unintended dimming. */}
      {wallpaper ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: `url("${wallpaper}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Tinted wash so the photo leans toward the active theme instead of
              fighting it — a green photo under the Ember theme reads as a bug. */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "var(--chat-canvas)", opacity: 0.45 }}
          />
          {/* The readability scrim. Opaque enough that incoming bubble text keeps
              its measured contrast over any photograph at all. */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "var(--chat-canvas)", opacity: 0.55 }}
          />
        </div>
      ) : null}
      {/* Header and thread follow the theme, so a tinted conversation is not
          framed by two neutral grey bars. */}
      <div className="chat-theme-surface relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="relative z-10 shrink-0">
          <ChatHeader
            summary={summary}
            currentUserId={currentUserId}
            conversationId={conversationId}
            initialOnline={online}
            /* DIY themes and custom wallpaper live behind the three-dot menu. */
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </header>

        {/* ── THE ONE SCROLL REGION ─────────────────────────────────────────
            `min-h-0` is load-bearing, not decorative: without it this flex
            child refuses to shrink below its content and the locked column
            overflows, which is what pushes the composer below the fold.

            The `px-4` is the thread's side padding and the `pb-4` clears the
            last bubble from the composer pill. Both live here rather than on
            the `<ul>` so the vertical rhythm of the thread is owned in one
            place. */}
        <div
          data-chat-scroll
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-3"
        >
          {/* Identity band. COLLAPSED by default — see MatchIntroCard's header
              comment for why. When it is open it is taller, which is the whole
              trade: the member spends that height on purpose, having tapped,
              instead of paying for it on every message they send. */}
          <MatchIntroCard summary={summary} />
          <LiveConversationThread
            conversationId={conversationId}
            currentUserId={currentUserId}
            initialMessages={initialMessages}
            participant={summary}
            calls={initialCalls}
          />
        </div>
      </div>

      {/* Locked bottom composer; it owns its own safe-area inset. */}
      <div className="chat-theme-surface relative z-10 shrink-0">
        <MessageComposer
          conversationId={conversationId}
          showIcebreakers={showIcebreakers}
          theme={theme}
          onThemeChange={setTheme}
        />
      </div>
    {/* DIY Chat themes + custom wallpaper. Mounted at the column root rather
          than inside the scroll region so it is never clipped or scrolled. */}
      <ChatSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        wallpaper={wallpaper}
        onWallpaperChange={setWallpaper}
      />
    </div>
  );
}