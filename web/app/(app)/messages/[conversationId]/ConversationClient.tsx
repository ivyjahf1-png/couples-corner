"use client";

import { useEffect } from "react";
import { ChatHeader } from "@/components/app/ChatHeader";
import { markConversationReadAction } from "@/lib/actions/messaging";
import { LiveConversationThread } from "@/components/app/LiveConversationThread";
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
 * ── WHAT THE INTRO CARD COST ──────────────────────────────────────────────────
 * This used to render a full `ConversationSummaryCard` between the header and
 * the first message: an avatar, identity chips, badges, a photo strip, an
 * interests grid and a disclosure toggle, opening EXPANDED. It is gone.
 *
 * It was a second profile banner directly beneath the header, restating the
 * name and avatar the header 4px above it already showed. On a 320px phone it
 * left almost no room for the messages it was describing, and the member had to
 * scroll past a stranger's photo grid to read "hi". The header carries the
 * identity now; the thread carries the conversation. That is the whole job of
 * each band, and having the header and a banner both answer "who am I talking
 * to" is what made the screen feel assembled rather than designed.
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

  return (
    <div
      className={`chat-theme-${theme} relative flex h-[100dvh] w-full flex-col overflow-hidden`}
      data-chat-theme={theme}
    >
      {/* Header and thread follow the theme, so a tinted conversation is not
          framed by two neutral grey bars. */}
      <div className="chat-theme-surface relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="relative z-10 shrink-0">
          <ChatHeader
            summary={summary}
            currentUserId={currentUserId}
            conversationId={conversationId}
            initialOnline={online}
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
    </div>
  );
}