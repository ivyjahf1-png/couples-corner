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
 *   - Shell: `h-full min-h-0` + overflow-hidden, filling the AppShell content
 *     region. AppShell already owns the 100dvh viewport lock, so this page must
 *     NOT be `position: fixed`: a fixed element escapes the shell's flex column
 *     and overlays the bottom tab nav, which is exactly the header/composer
 *     clipping this layout used to suffer.
 *   - `-mt-6` cancels the shell's `pt-6` so the chat is truly edge-to-edge
 *     (no dead band above the header).
 *   - <header> is `z-10 shrink-0`: locked at the top, never compressed.
 *   - The thread wrapper is `flex-1 min-h-0 overflow-y-auto overflow-x-hidden`:
 *     the ONLY scroller, explicitly bounded between header and composer.
 *   - The composer is `z-10 shrink-0`: locked at the bottom, sitting directly
 *     above the shell's in-flow tab nav, never truncated.
 *
 * NOTE: LiveConversationThread's <ul> must stay non-scrolling (overflow-x-hidden
 * only). Two nested overflow-y-auto containers cause scroll chaining and the
 * erratic bouncing this page used to have.
 */export default async function MessagesPage({ params }: ConversationPageProps) {
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
    <div className="relative -mt-6 flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950 sm:-mt-6">
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
        className="flex-1 min-h-0 space-y-4 overflow-y-auto overflow-x-hidden p-4"
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
