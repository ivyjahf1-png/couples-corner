"use client";

import { useState, useEffect } from "react";
import { ChatHeader } from "@/components/app/ChatHeader";
import { ChatSafetyBanner } from "@/components/app/ChatSafetyBanner";
import { markConversationReadAction } from "@/lib/actions/messaging";
import { ConversationSummaryCard } from "@/components/app/ConversationSummaryCard";
import { LiveConversationThread } from "@/components/app/LiveConversationThread";
import { MessageComposer, useChatTheme } from "@/components/app/MessageComposer";
import { usePresence } from "@/lib/hooks/usePresence";
import type { ChatStarter, ConversationParticipantSummary } from "@/lib/feature/types";

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
 * The layout contract from the server page is preserved exactly: header
 * `shrink-0`, ONE scroll region (`data-chat-scroll`), composer `shrink-0`. Two
 * nested `overflow-y-auto` containers is what previously caused the erratic
 * scroll chaining on this page.
 */
export default function ConversationClient({
  conversationId,
  currentUserId,
  summary,
  starter,
  initialMessages,
  initialOnline = false,
}: {
  conversationId: string;
  currentUserId: string;
  summary: ConversationParticipantSummary | null;
  starter: ChatStarter | null;
  /**
   * Inferred from `LiveConversationThread` rather than re-declared: the `Message`
   * interface is local to that file, and copying its shape here would be a
   * second definition free to drift out of step with the first.
   */
  initialMessages: NonNullable<
    React.ComponentProps<typeof LiveConversationThread>["initialMessages"]
  >;
  initialOnline: boolean;
}) {
  const { theme, setTheme } = useChatTheme();

  // The intro card opens EXPANDED here, so the interest tags and photo
  // previews — the parts that tell a member whether this person is worth
  // replying to — are visible without a tap. It is the one surface a member
  // reads before deciding whether to continue, so burying the substance behind
  // a disclosure arrow hid exactly what the card is for. The member can still
  // collapse it to get the messages back.
  const [summaryExpanded, setSummaryExpanded] = useState(true);

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
  // arrive live. The server-rendered `starter` is available as one more opener
  // when present — it is real content chosen for this conversation.
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

        {showIcebreakers ? <ChatSafetyBanner /> : null}

        {/* The ONLY vertical scroll region on this page. */}
        <div data-chat-scroll className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {/* The bright-yellow intro card opens the conversation, directly above
              the thread. It is INSIDE the scroll region rather than pinned
              beneath the header on purpose: it is tall (avatar, identity chips,
              badges, photos), and a fixed card of that height on a 320px phone
              leaves almost no room for the messages it is describing. Pinned,
              it would also stop the member scrolling back to re-read who they
              are talking to — which is the single most useful thing on it.

              It carries its own bottom padding and keeps a softened top edge, so
              it reads as the head of the thread rather than a card floating in a
              gap above the first message. The rounded top is only visible when
              the thread is scrolled to the very top, which is exactly when the
              member is reading it. */}
          <ConversationSummaryCard
            summary={summary}
            expanded={summaryExpanded}
            onToggleExpand={() => setSummaryExpanded((v) => !v)}
          />

          <div className="p-4">
            <LiveConversationThread
              conversationId={conversationId}
              currentUserId={currentUserId}
              initialMessages={initialMessages}
            />
          </div>
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