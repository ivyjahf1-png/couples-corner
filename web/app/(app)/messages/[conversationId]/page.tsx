import { notFound } from "next/navigation";
import { ChatHeader } from "@/components/app/ChatHeader";
import { LiveConversationThread } from "@/components/app/LiveConversationThread";
import { MessageComposer } from "@/components/app/MessageComposer";
import {
  getConversationChatDataAction,
  markConversationReadAction,
} from "@/lib/actions/messaging";
import { getCurrentSessionUser } from "@/lib/server/session";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

/**
 * A single conversation thread.
 *
 * Layout contract - exactly one vertical scroll region:
 *   - Shell: `relative flex h-[100dvh] w-full flex-col overflow-hidden`. This
 *     page owns the full dynamic viewport because the app shell drops its
 *     `<main>` padding on this route (see `AppMain`), so nothing is
 *     subtracted from the measurement. The column is locked and never bounces.
 *
 *   - The bottom tab nav is HIDDEN on this route by `BottomNavRegion`, so the
 *     content region grows to fill the reclaimed space. `/messages` (the
 *     list) still shows the tab bar, so tapping the back arrow in
 *     `ChatHeader` brings the bar straight back.
 *   - `<header>` is `z-10 shrink-0`: locked at the top, never compressed or
 *     clipped, carrying the back arrow, avatar, name/status and call buttons.
 *   - The thread wrapper is `flex-1 min-h-0 overflow-y-auto overflow-x-hidden`:
 *     the ONLY scroller, explicitly bounded between header and composer.
 *   - The composer is `z-10 shrink-0` and owns its own safe-area inset, since
 *     nothing below it applies that clearance any more.
 *
 * NOTE: LiveConversationThread's `<ul>` must stay non-scrolling
 * (overflow-x-hidden only). Two nested overflow-y-auto containers cause scroll
 * chaining and the erratic bouncing this page used to have.
 */
export default async function MessagesPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  const user = await getCurrentSessionUser();

  const chatData = await getConversationChatDataAction(conversationId);
  if (!chatData || !user) {
    notFound();
  }

  const { summary, initialMessages } = chatData;

  // Mark messages read on first load so the Chat tab badge clears.
  void markConversationReadAction(conversationId);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950">
      {/* Locked static header. ChatHeader supplies its own border/padding. */}
      <header className="relative z-10 shrink-0">
        <ChatHeader
          summary={summary}
          currentUserId={user.uid}
          conversationId={conversationId}
        />
      </header>

      {/* The only vertical scroll region on this page. */}
      <div
        data-chat-scroll
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4"
      >
        <LiveConversationThread
          conversationId={conversationId}
          currentUserId={user.uid}
          initialMessages={initialMessages ?? []}
        />
      </div>

      {/* Locked bottom composer. MessageComposer handles its own safe area. */}
      <div className="relative z-10 shrink-0">
        <MessageComposer conversationId={conversationId} />
      </div>
    </div>
  );
}
