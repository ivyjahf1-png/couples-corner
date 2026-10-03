import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { MessagesInbox, type InboxChat } from "@/components/app/MessagesInbox";
import { MessagesComposeFab } from "@/components/app/MessagesComposeFab";
import { requireUser } from "@/lib/auth/authorization";
import { getInboxSummaries } from "@/lib/server/messaging";
import { getBotThreadsForUser } from "@/lib/server/likes";

export const dynamic = "force-dynamic";

/**
 * Messages - the private inbox.
 *
 * A thin Server Component with exactly three jobs: authenticate, fetch the two
 * conversation sources, and hand plain serialisable rows to `MessagesInbox`.
 * Every pixel is painted by that one client component, because the header pills,
 * the search field and the list are a single filter surface and splitting them
 * would mean lifting that state into a client boundary anyway.
 *
 * WHY THE DATA IS SHAPED HERE AND NOT IN THE CLIENT: the inbox card renders
 * "Sarah Chen, 32". The age is DERIVED from the other member's date_of_birth by
 * `getInboxSummaries`, so only the integer crosses this boundary - the date of
 * birth itself never leaves the server.
 *
 * NO BACKGROUND OPTION IS PASSED DOWN, DELIBERATELY. This route has never had a
 * wallpaper control, and it must not grow one by accident: a photo behind a list
 * of faces and message previews is the wrong trade on this screen. A legacy
 * `couples_corner:chat-wallpaper` entry in localStorage used to fight that, so
 * `MessagesInbox` purges the key on mount and paints solid slate under the rows.
 * If someone later wants a wallpaper HERE, that is a product decision, not a
 * default to restore.
 */
export default async function MessagesPage() {
  const user = await requireUser();

  /* Concurrent, not sequential: these are independent reads and serialising
     them would add one round trip to every page load for no benefit. */
  const [conversations, botThreads] = await Promise.all([
    getInboxSummaries(user.uid),
    getBotThreadsForUser(user.uid),
  ]);

  /**
   * Both sources merged into one recency-ordered list.
   *
   * `getInboxSummaries` reads real member-to-member `conversations`;
   * `getBotThreadsForUser` reads bot persona threads from the FK-free bot tables.
   * Both fail soft to `[]`, and the `.filter` guards mean a malformed row cannot
   * produce a React key of `undefined`.
   *
   * `callHrefBase` is the call route WITHOUT the mode segment, so the client can
   * pick audio or video off the same conversation. It is `null` for bot threads:
   * there is no `conversations` row behind a persona, so /call/<id>/ would 404.
   * That null is what renders the call tiles inert instead of as links that
   * break.
   */
  const chats: InboxChat[] = [
    ...(Array.isArray(conversations) ? conversations : [])
      .filter((c) => c?.id)
      .map((c) => ({
        key: `conv-${c.id}`,
        href: `/messages/${c.id}`,
        name: c.name,
        kind: c.kind,
        avatarUrl: c.avatarUrl,
        /* Null unless they shared a date of birth - the card then renders the
           name alone rather than a placeholder age. */
        age: c.age,
        preview: c.preview,
        lastMessageAt: c.lastMessageAt,
        unread: c.unread,
        isOnline: c.isOnline,
        isPinned: c.isPinned ?? false,
        callHrefBase: `/call/${c.id}`,
      })),
    ...(Array.isArray(botThreads) ? botThreads : [])
      .filter((b) => b?.personaId)
      .map((b) => ({
        key: `bot-${b.personaId}`,
        href: `/messages?bot=${encodeURIComponent(b.personaId)}`,
        name: b.name,
        kind: b.kind,
        avatarUrl: b.avatarUrl,
        /* Personas have no date of birth, so there is never an age to print. */
        age: null,
        preview: b.preview,
        lastMessageAt: b.lastMessageAt,
        unread: b.unread,
        isOnline: false,
        isBot: true,
        callHrefBase: null,
      })),
  ].sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });

  return (
    <>
      <MessagesInbox
        chats={chats}
        emptyState={
          <EmptyState
            icon="chat"
            title="No messages yet"
            body="Once you connect with someone, you can start a private chat from their profile."
            action={
              <Link href="/discover" className="text-sm font-semibold text-brand-300 hover:underline">
                Discover people
              </Link>
            }
          />
        }
      />

      {/* Compose FAB, bottom-right, clear of the 5rem tab bar. It replaces the
          Game Center button this page used to float there - two round floating
          buttons would fight for the same corner. */}
      <MessagesComposeFab />
    </>
  );
}
