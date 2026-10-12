
import { requireUser } from "@/lib/auth/authorization";
import { getInboxSummaries } from "@/lib/server/messaging";
import { ChatHub } from "@/components/app/ChatHub";

/**
 * /chat — the messages hub list.
 *
 * A server component: it authenticates the caller, fetches the conversation
 * summaries, and hands plain serializable rows to the client `ChatHub` which
 * owns all interactive chrome (stories, Chat/Activity tab switcher, and the
 * swipeable conversation rows). The route is protected by `requireUser`, so an
 * anonymous visitor is redirected to /login before any data is read.
 *
 * `getInboxSummaries` already resolves the name, kind, avatar, preview, last
 * message, unread count, online state and pinned flag in one shot. We only
 * add the row identity (`key`) and the thread link (`href`) that the inbox
 * rows consume.
 */

export default async function ChatPage() {
  const user = await requireUser();

  const chats = (await getInboxSummaries(user.uid))
    .filter((c) => c?.id)
    .map((c) => ({
      key: `conv-${c.id}`,
      href: `/messages/${c.id}`,
      ...c,
    }));

  return <ChatHub chats={chats} displayName={user.email} />;
}
