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
 *   - Shell: h-[100dvh] flex column with overflow-hidden. The page itself
 *     never scrolls, which is what stops side-to-side and rubber-band drift.
 *   - <header> is shrink-0: locked at the top.
 *   - The thread wrapper is flex-1 overflow-y-auto overflow-x-hidden: the ONLY
 *     scroller on the page.
 *   - The composer is shrink-0: locked at the bottom.
 *
 * NOTE: LiveConversationThread's <ul> must stay non-scrolling (overflow-x-hidden
 * only). Two nested overflow-y-auto containers cause scroll chaining and the
 * erratic bouncing this page used to have.
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
    <div className="flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-slate-950 md:h-[calc(100dvh-7rem)]">
      {/* Locked static header. ChatHeader supplies its own border/padding. */}
      <header className="shrink-0">
        <ChatHeader
          summary={summary}
          currentUserId={user.uid}
          conversationId={conversationId}
        />
      </header>

      {/* The only vertical scroll region on this page. */}
      <div
        data-chat-scroll
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-950"
      >
        <LiveConversationThread
          conversationId={conversationId}
          currentUserId={user.uid}
          initialMessages={initialMessages ?? []}
        />
      </div>

      {/* Locked bottom composer. MessageComposer handles its own safe area. */}
      <div className="shrink-0">
        <MessageComposer conversationId={conversationId} />
      </div>
    </div>
  );
}
