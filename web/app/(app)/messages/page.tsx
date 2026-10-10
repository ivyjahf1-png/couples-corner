import { MessagesInbox, type InboxChat } from "@/components/app/MessagesInbox";
import { requireUser } from "@/lib/auth/authorization";
import { getInboxSummaries } from "@/lib/server/messaging";
import { getBotThreadsForUser } from "@/lib/server/likes";
import { getProfileStats } from "@/lib/server/profile-stats";

export const dynamic = "force-dynamic";

/**
 * Messages — the private inbox.
 *
 * A thin Server Component with three jobs: authenticate, fetch the conversation
 * sources, and hand plain serialisable rows to `MessagesInbox`. Every pixel is
 * painted by that one client component.
 *
 * WHY THE DATA IS SHAPED HERE AND NOT IN THE CLIENT: the row renders
 * "Loura · 10-02 20:35". The timestamp is derived from `lastMessageAt` inside the
 * client component (it is display formatting, and it must use the browser's local
 * timezone — formatting UTC on the server would print the wrong hour for most of
 * Europe), while the age is DERIVED server-side by `getInboxSummaries` so the date
 * of birth itself never leaves the server.
 *
 * THE THREE SYSTEM ROWS ARE NOT DATA. "Visitors" is real — `getProfileStats`
 * counts `profile_visitors`. "Official Team" and "Expired Messages" are inbox
 * furniture with no table behind them; they are composed inside the client
 * component so this page does not have to invent empty queries for them.
 *
 * `expiredCount` is 0 because there is no expired-messages table yet. It is a
 * real parameter rather than a hardcoded "4" so the badge appears as soon as
 * something can count it, instead of asserting a number the app cannot know.
 */
export default async function MessagesPage() {
  const user = await requireUser();

  /* Concurrent, not sequential: these are independent reads and serialising them
     would add a round trip to every page load for no benefit. */
  const [conversations, botThreads, stats] = await Promise.all([
    getInboxSummaries(user.uid),
    getBotThreadsForUser(user.uid),
    getProfileStats(user.uid),
  ]);

  /* Both conversation sources merged into one recency-ordered list.
     `getInboxSummaries` reads real member-to-member `conversations`;
     `getBotThreadsForUser` reads bot persona threads from the FK-free bot tables.
     Both fail soft to `[]`, and the `.filter` guards mean a malformed row cannot
     produce a React key of `undefined`. */
  const chats: InboxChat[] = [
    ...(Array.isArray(conversations) ? conversations : [])
      .filter((c) => c?.id)
      .map((c) => ({
        key: `conv-${c.id}`,
        href: `/messages/${c.id}`,
        name: c.name,
        kind: c.kind,
        avatarUrl: c.avatarUrl,
        /* The other participant's uid — lets the avatar open the profile modal
           in place instead of only entering the thread. */
        userId: c.userId,
        /* Null unless they shared a date of birth — the row then renders the name
           alone rather than a placeholder age. */
        age: c.age,
        preview: c.preview,
        lastMessageAt: c.lastMessageAt,
        unread: c.unread,
        isOnline: c.isOnline,
        isPinned: c.isPinned ?? false,
        /* DECORATIVE FIELDS, LEFT UNSET ON PURPOSE.

           `emoji`, `frame` and `stickers` render the reference's ornaments (the
           heart/kiss runs, the gold VIP ring, the anime stickers). There is no
           column for any of them in this schema, so nothing here invents them —
           a member cannot choose their own ornaments yet, and asserting "VIP" or
           "heart run" for someone the database says nothing about would be a lie
           on their own profile. Rows render correctly without them, and wiring
           these becomes a two-line change here once the columns exist. */
      })),
    ...(Array.isArray(botThreads) ? botThreads : [])
      .filter((b) => b?.personaId)
      .map((b) => ({
        key: `bot-${b.personaId}`,
        /* Bot personas have no `conversations` row behind them, so this points at
           the persona via the query string rather than a /messages/<id> route
           that would 404. */
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
      })),
  ].sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });

  return (
    /* No `EmptyState` prop any more: the inbox renders its own light-themed empty
       block. `EmptyState` hardcodes the old dark palette and cannot be themed
       from the call site.

       VIEWPORT-LOCKED WRAPPER — `h-[100dvh] w-full overflow-hidden flex flex-col`.
       The height is stated in DVH against the VIEWPORT rather than inherited as
       a percentage, because the chain above this element is not guaranteed to be
       definite: the shell and `<main>` are content-sized flex items, and a
       `height: 100%` on `PageLock` resolves to auto against an indefinite
       parent. The failure mode is specific and ugly — the lock box grows to its
       content, the body's `overflow-y-auto` has nothing to scroll past, and the
       whole thing gets clipped by `<main>`'s `overflow-hidden`: an inbox whose
       rows below the fold are simply unreachable. Stating 100dvh cuts that chain
       entirely — the wrapper is bounded no matter what the ancestors do, so
       `PageLock`'s `height: 100%` finally has a definite box to measure.

       `overflow-hidden` + `flex-col` make containment structural: the only
       element allowed to scroll is the list inside `PageLock`, never this box
       and never the document. The wrapper is also a flex item of `<main>`, so
       it SHRINKS when the viewport claim exceeds the space available (the demo
       banner sits above it) instead of overflowing — the list absorbs the
       difference and nothing is clipped. */
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col">
      <MessagesInbox chats={chats} visitors={stats.visitors} expiredCount={0} />
    </div>
  );
}
