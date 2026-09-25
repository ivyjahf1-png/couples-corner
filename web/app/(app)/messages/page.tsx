import Link from "next/link";
import { PageHeader, PageLock } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Avatar } from "@/components/app/Avatar";
import { ContentSlot } from "@/components/content/ContentSlot";
import { NearMeStories } from "@/components/app/NearMeStories";
import { StoryTray } from "@/components/app/StoryTray";
import { requireUser } from "@/lib/auth/authorization";
import { getInboxSummaries } from "@/lib/server/messaging";
import { getBotThreadsForUser } from "@/lib/server/likes";

export const dynamic = "force-dynamic";

/**
 * Messages — the private inbox.
 *
 * • Header title is explicitly "Messages" (no "Conversation" wording).
 * • Top: horizontal "Near me" stories row (geolocation-aware worldwide).
 * • Below: active chat list (friends + bots) with last-message preview,
 *   timestamps and unread badges.
 */
export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await getInboxSummaries(user.uid);
  const botThreads = await getBotThreadsForUser(user.uid);

  const activeChats: Array<{
    key: string;
    href: string;
    name: string;
    kind: "person" | "couple";
    avatarUrl: string | null;
    preview: string;
    lastMessageAt: string | null;
    unread: number;
    isOnline: boolean;
    isBot?: boolean;
  }> = [
    ...(Array.isArray(conversations) ? conversations : [])
      .filter((c) => c?.id)
      .map((c) => ({
        key: `conv-${c.id}`,
        href: `/messages/${c.id}`,
        name: c.name,
        kind: c.kind,
        avatarUrl: c.avatarUrl,
        preview: c.preview,
        lastMessageAt: c.lastMessageAt,
        unread: c.unread,
        isOnline: c.isOnline,
      })),
    ...(Array.isArray(botThreads) ? botThreads : [])
      .filter((b) => b?.personaId)
      .map((b) => ({
        key: `bot-${b.personaId}`,
        href: `/messages?bot=${encodeURIComponent(b.personaId)}`,
        name: b.name,
        kind: b.kind,
        avatarUrl: b.avatarUrl,
        preview: b.preview,
        lastMessageAt: b.lastMessageAt,
        unread: b.unread,
        isOnline: false,
        isBot: true,
      })),
  ].sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });

  return (
    <PageLock
      className="mx-auto w-full max-w-3xl"
      bodyClassName="pb-28 md:pb-8"
      head={
        <PageHeader
          eyebrow="Inbox"
          title="Messages"
          subtitle="Private chats with your connections. Only you and the other participant can read them."
        />
      }
    >
      {/* Status tray sits directly under the static header; only the chat list
          below it scrolls. */}
      <div className="shrink-0">
        <StoryTray userId={user.uid} displayName={user.email?.split("@")[0] ?? "You"} />
      </div>

      {/* Near me — horizontal scrollable circular avatars (location-aware). */}
      <NearMeStories />

      {activeChats.length === 0 ? (
        <EmptyState
          icon="chat"
          title="No messages yet"
          body="Once you connect with someone, you can start a private chat from their profile."
          action={
            <Link href="/discover" className="text-sm font-medium text-brand-300 hover:underline">
              Discover people
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="chats-heading" className="flex flex-col gap-3">
          <h2 id="chats-heading" className="text-sm font-semibold uppercase tracking-wide text-ink-400">
            Active chats <span className="text-ink-500">({activeChats.length})</span>
          </h2>

          {/* Flat, borderless list — rows sit directly on the navy canvas. */}
          <ul className="flex flex-col">
            {activeChats.filter((c) => c?.key).map((chat) => (
              <li key={chat.key}>
                <ChatRow chat={chat} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Promotional slot */}
      <ContentSlot placement="messages" />
    </PageLock>
  );
}

type ActiveChatRow = {
  key: string;
  href: string;
  name: string;
  kind: "person" | "couple";
  avatarUrl: string | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  isOnline: boolean;
  isBot?: boolean;
};
function ChatRow({ chat: conversation }: { chat: ActiveChatRow | null | undefined }) {
  if (!conversation) return null;
  const name = conversation.name?.trim() || "Chat";
  const unread = Math.max(conversation.unread ?? 0, 0);
  const at = conversation.lastMessageAt ? formatChatTime(conversation.lastMessageAt) : null;

  return (
    <Link
      href={conversation.href as never}
      className="flex items-center gap-4 px-1 py-3 transition-colors hover:bg-white/5 sm:px-2"
    >
      <div className="relative shrink-0">
        {conversation.avatarUrl ? (
          <img
            src={conversation.avatarUrl}
            alt={name}
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <Avatar name={name} kind={conversation.kind} size="md" className="bg-brand-500/15 text-brand-300" />
        )}
        {conversation.isOnline ? (
          <span
            aria-label="Online"
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0F172A] bg-emerald-400"
          />
        ) : null}
        {unread > 0 ? (
          <span
            aria-label={`${unread} unread ${unread === 1 ? "message" : "messages"}`}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-[#FF5722] px-1 text-[10px] font-bold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className={["truncate text-sm text-white", unread > 0 ? "font-semibold" : "font-medium"].join(" ")}>
          {name}
        </p>
        <p className={["truncate text-xs", unread > 0 ? "text-ink-200" : "text-ink-400"].join(" ")}>
          {conversation.preview?.trim() || "No messages yet"}
        </p>
      </div>

      {at ? (
        <span className={["shrink-0 text-[11px]", unread > 0 ? "text-brand-300" : "text-ink-400"].join(" ")}>
          {at}
        </span>
      ) : null}
    </Link>
  );
}

/** Compact relative/absolute chat timestamp. */
function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}


