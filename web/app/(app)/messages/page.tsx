import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { MessagesInbox, type InboxChat } from "@/components/app/MessagesInbox";
import { MessagesComposeFab } from "@/components/app/MessagesComposeFab";
import { requireUser } from "@/lib/auth/authorization";
import { getInboxSummaries } from "@/lib/server/messaging";
import { getBotThreadsForUser } from "@/lib/server/likes";

export const dynamic = "force-dynamic";

/**
 * Messages â€” the private inbox.
 *
 * â”€â”€ WHAT THIS PAGE IS NOW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * A thin Server Component whose only jobs are: authenticate, fetch the two
 * conversation sources, merge them newest-first, and hand plain serialisable
 * rows to `MessagesInbox`. Every pixel of the screen is rendered by that one
 * client component, because the header pills, the search field and the list are
 * a single filter surface and splitting them would mean lifting the state here
 * into a client boundary anyway.
 *
 * THE OLD LAYOUT IS GONE. This page previously stacked, above the fold and
 * before a single conversation: a Chat/Call segmented control, a two-up grid of
 * scam + official-team cards, a status story tray, a "Near me" stories reel, a
 * profile-visitor teaser, and a separate search field of its own. Seven pieces
 * of chrome. The story reel and the visitor teaser are removed outright â€” the
 * former is a browsing surface that belongs on Discover, and the latter had no
 * data source at all and therefore rendered nothing anyway.
 *
 * â”€â”€ THE DARK CANVAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The screen renders on the app's midnight navy-purple (#0F0A1C) with the brand
 * orange on interactive elements, matching the chat room. It was briefly a
 * near-white list with dark text; that made Messages the only light surface in
 * the app and flashed the member from a white list onto a dark thread on every
 * tap-through. The conversation rows are dark raised cards on that canvas, so
 * each still reads as a discrete tappable row.
 */
export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await getInboxSummaries(user.uid);
  const botThreads = await getBotThreadsForUser(user.uid);

  /**
   * The two conversation sources merged into one list.
   *
   * `getInboxSummaries` reads real member-to-member `conversations`;
   * `getBotThreadsForUser` reads bot persona threads from the FK-free bot
   * tables. Both fail soft to `[]`, and the `.filter` guards mean a malformed
   * row cannot produce a React key of `undefined`.
   *
   * `callHrefBase` is the call route WITHOUT the mode segment, so the client
   * can pick audio or video off the same conversation. It is `null` for bot
   * threads: there is no `conversations` row behind a persona, so
   * `/call/<personaId>/â€¦` would 404. That null is what renders the call tiles
   * inert instead of as links that break.
   */
  const activeChats: InboxChat[] = [
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
        /* Real conversation, so it is genuinely callable. */
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
        preview: b.preview,
        lastMessageAt: b.lastMessageAt,
        unread: b.unread,
        isOnline: false,
        isBot: true,
        /* A bot persona has no `conversations` row, so there is no call route
           to link to. See the note on `callHrefBase` above. */
        callHrefBase: null,
      })),
  ].sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });

  /* The canvas, the side padding and the scroll region all live in
     `MessagesInbox`'s `PageLock` — the header, search field and list are one
     scroll body, so they must be configured in the same place rather than
     split across this page and the client component. */
  return (
    <>
      <MessagesInbox
        chats={activeChats.filter((c) => c?.key)}
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

      {/* Blue compose FAB, bottom-right, above the 5rem tab bar. Replaces the
          Game Center button this page used to float there — two round floating
          buttons would fight for the same corner. */}
      <MessagesComposeFab />
    </>
  );
}


