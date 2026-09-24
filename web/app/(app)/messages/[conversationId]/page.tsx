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
 * Server-fetches the conversation + participant profile + a seeded chat
 * starter, then hands off to client components that subscribe to
 * Supabase Realtime and render the bottom input bar.
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
    <div className="flex h-[calc(100dvh-14rem)] min-h-[28rem] flex-col gap-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40 md:h-[calc(100dvh-7rem)]">
      {/* Fixed top: slim messenger header (no Private-chat card, no badges) */}
      <div className="flex-shrink-0">
        <ChatHeader summary={summary} />
      </div>

      {/* Scrollable message thread */}
      <div className="min-h-0 flex-1 overflow-hidden bg-slate-950">
        <LiveConversationThread
        conversationId={conversationId}
        currentUserId={user.uid}
        initialMessages={initialMessages ?? []}
      />
      </div>

      {/* Sticky bottom: composer (lifted above the mobile tab bar) */}
      <div className="flex-shrink-0 pb-20 md:pb-0">
        <MessageComposer conversationId={conversationId} />
      </div>
    </div>
  );
}

