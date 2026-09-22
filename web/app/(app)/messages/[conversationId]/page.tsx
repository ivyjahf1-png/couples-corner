import Link from "next/link";
import { notFound } from "next/navigation";
import { ConversationSummaryCard } from "@/components/app/ConversationSummaryCard";
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

  const { conversation, summary, initialMessages } = chatData;

  // Mark messages read on first load so the Chat tab badge clears.
  void markConversationReadAction(conversationId);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0">
      {/* Fixed top: back + summary card */}
      <div className="flex-shrink-0 border-b border-ink-700/70 bg-slate-950/80">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/messages"
            aria-label="Back to Messages"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 bg-surface text-ink-200 hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <path d="M14 6 L8 12 L14 18" />
            </svg>
          </Link>
          <span className="text-sm font-medium text-ink-300">
            {conversation.type === "couple" ? "Couple chat" : "Private chat"}
          </span>
        </div>
        <ConversationSummaryCard summary={summary} expanded />
      </div>

                   {/* Scrollable message thread */}
      <LiveConversationThread
        conversationId={conversationId}
        currentUserId={user.uid}
        initialMessages={initialMessages ?? []}
      />

      {/* Sticky bottom: composer */}
      <MessageComposer conversationId={conversationId} />
    </div>
  );
}

