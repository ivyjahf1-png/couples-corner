import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ConversationItem } from "@/components/app/ConversationItem";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/landing/Icon";
import { demoConversationViews } from "@/lib/demo/demo-data";
import { ContentSlot } from "@/components/content/ContentSlot";

/**
 * Private-messaging inbox. Conversation list (desktop) with search + unread
 * badges; selecting a conversation opens the thread at /messages/[id]. All
 * conversations are clearly-labeled structural demo data until Firestore lands.
 */
export default function MessagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Messages"
        title="Conversations"
        subtitle="Private chats with your connections. Only you and the other participant can read them."
      />

      {demoConversationViews.length === 0 ? (
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
              {demoConversationViews.map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} />
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
