import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/landing/Icon";
import { ContentSlot } from "@/components/content/ContentSlot";
import { getConversationsAction } from "@/lib/actions/messaging";

interface ConversationView {
  id: string;
  name: string;
  kind: "person" | "couple";
  lastMessage: string;
  lastMessageAt: string | null;
  unread: number;
}

/**
 * Private-messaging inbox. Conversation list (desktop) with search + unread
 * badges; selecting a conversation opens the thread at /messages/[id].
 */
export default async function MessagesPage() {
  const conversations = await getConversationsAction();

  // Map DB rows to view model (simplified — in production, resolve participant names)
  const views: ConversationView[] = conversations.map((c) => ({
    id: c.id,
    name: `Conversation`,
    kind: c.type === "couple" ? "couple" : "person",
    lastMessage: "",
    lastMessageAt: c.last_message_at,
    unread: 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Messages"
        title="Conversations"
        subtitle="Private chats with your connections. Only you and the other participant can read them."
      />

      {views.length === 0 ? (
        <EmptyState
          icon="chat"
          title="No conversations yet"
          body="Once you connect with someone, you can start a private conversation from their profile."
          action={
            <Link href="/discover" className="text-sm font-medium text-brand-700 hover:underline">
              Discover people
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
          {/* Conversation list */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <label htmlFor="conversation-search" className="sr-only">
                Search conversations
              </label>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
              />
              <input
                id="conversation-search"
                type="search"
                placeholder="Search conversations…"
                className="h-10 w-full rounded-xl border border-ink-200 bg-surface pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
            </div>

            <Card padding="none" className="divide-y divide-ink-200 overflow-hidden">
              {views.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-muted"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {conversation.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{conversation.name}</p>
                    <p className="truncate text-xs text-ink-500">
                      {conversation.lastMessage ?? "No messages yet"}
                    </p>
                  </div>
                  {conversation.lastMessageAt && (
                    <span className="shrink-0 text-[11px] text-ink-400">
                      {new Date(conversation.lastMessageAt).toLocaleDateString()}
                    </span>
                  )}
                </Link>
              ))}
            </Card>
          </div>

          {/* Placeholder pane (desktop) */}
          <div className="hidden lg:block">
            <EmptyState
              icon="chat"
              title="Select a conversation"
              body="Choose a conversation from the list to read and reply. Messaging stays between participants — always."
              className="h-full justify-center"
            />
          </div>
        </div>
      )}

      {/* Promotional slot */}
      <ContentSlot placement="messages" />
    </div>
  );
}
