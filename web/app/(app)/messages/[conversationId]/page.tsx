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
 *   - Shell: `fixed inset-0` + h-[100dvh] + overflow-hidden. Pinning the root
 *     to the viewport is what removes rubber-banding: the document behind it
 *     has no height to scroll, so iOS Safari has nothing to bounce against.
 *   - <header> is shrink-0: locked at the top.
 *   - The thread wrapper is flex-1 min-h-0 overflow-y-auto overflow-x-hidden:
 *     the ONLY scroller on the page.
 *   - The composer is shrink-0: locked at the bottom.
 *
 * NOTE: `fixed inset-0` deliberately overlays the app shell's sidebar and the
 * fixed bottom tab bar, so a chat reads as a full-bleed surface. Consequence:
 * the mobile tab bar is not reachable while a conversation is open - the
 * ChatHeader back button is the way out. If you would rather keep the tab bar
 * visible, drop `fixed` and use a normal flow container with
 * `h-[calc(100dvh-7rem)]` at md and up instead.
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
    <div className="fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950">
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
        className="flex-1 min-h-0 space-y-4 overflow-y-auto overflow-x-hidden p-4"
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
