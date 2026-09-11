import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { LiveConversationThread } from "@/components/app/LiveConversationThread";
import { MessageComposer } from "@/components/app/MessageComposer";
import { getConversationAction, getMessagesAction } from "@/lib/actions/messaging";
import { getCurrentSessionUser } from "@/lib/server/session";

/**
 * A single conversation thread with Supabase Realtime.
 *
 * Server-fetches the conversation and initial messages, then hands off to
 * a client component that subscribes to postgres_changes for live updates.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  const [conversation, initialMessages, user] = await Promise.all([
    getConversationAction(conversationId),
    getMessagesAction(conversationId),
    getCurrentSessionUser(),
  ]);

  if (!conversation) notFound();

  // Derive a display name from participant info (simplified)
  const title = `Conversation`;

  return (
    <div className="flex h-full min-h-[70dvh] flex-col gap-4">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-ink-200 pb-4">
        <Link
          href="/messages"
          aria-label="Back to conversations"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M14 6 L8 12 L14 18" />
          </svg>
        </Link>
        <Avatar name={title} kind="person" />
        <div className="min-w-0">
          <h1 className="truncate font-semibold text-ink-900">{title}</h1>
          <p className="text-xs text-ink-600">
            Private conversation · {conversation.type === "couple" ? "couple" : "individual"}
          </p>
        </div>
      </div>

      {/* Live message thread */}
      <LiveConversationThread
        conversationId={conversationId}
        currentUserId={user?.uid ?? ""}
        initialMessages={initialMessages.map((m) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          type: m.type,
          body: m.body,
          created_at: m.created_at,
        }))}
      />

      {/* Composer */}
      <MessageComposer conversationId={conversationId} />
    </div>
  );
}
