import Link from "next/link";
import { PageLock } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";

import { ContentSlot } from "@/components/content/ContentSlot";
import { NearMeStories } from "@/components/app/NearMeStories";
import { StoryTray } from "@/components/app/StoryTray";
import { MessagesInboxTabs } from "@/components/app/MessagesInboxTabs";
import { MessagesInboxList } from "@/components/app/MessagesInboxList";
import { OfficialTeamCard, ProfileVisitorsCard } from "@/components/app/MessagesInboxCards";
import { GameCenterButton } from "@/components/app/GameCenterButton";
import { ChatSafetyBanner } from "@/components/app/ChatSafetyBanner";
import { requireUser } from "@/lib/auth/authorization";
import { getInboxSummaries } from "@/lib/server/messaging";
import { getBotThreadsForUser } from "@/lib/server/likes";

export const dynamic = "force-dynamic";

/**
 * Messages — the private inbox.
 *
 * ── THE DARK CANVAS ──────────────────────────────────────────────────────────
 * This screen renders on the app's midnight navy-purple (#0F0A1C) with the
 * brand orange on the interactive elements, matching the chat room and every
 * other surface in the product. It was briefly a near-white `#FAFAFA` list with
 * dark text; that made the messages screen the only light surface in the app and
 * flashed the member from a white list onto a dark thread on every tap-through.
 *
 * Colours here are the app's dark tokens (`bg-surface`, `border-white/10`,
 * `text-ink-300`) rather than the literal slate values used in the previous
 * light version. The conversation rows are dark raised cards on the canvas —
 * `bg-surface` against #0F0A1C gives the separation that the white cards gave
 * against #FAFAFA, so each conversation still reads as a discrete tappable row
 * rather than one undifferentiated block.
 *
 * The chat room's own `--chat-*` tokens are separate: those are per-conversation
 * themes, and the default one is now this same midnight purple.
 *
 * • Top: "Chat / Call" switch, then the horizontal "Near me" stories row.
 * • Prominent scam warning directly below the header.
 * • Informational cards ("seen me", Official Team), then the conversation list.
 */
export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await getInboxSummaries(user.uid);
  const botThreads = await getBotThreadsForUser(user.uid);

  /**
   * How many members have viewed this profile.
   *
   * `null` because there is NO profile-view tracking in the product — no table,
   * no write path, no read path. See the note on `ProfileVisitorsCard`.
   *
   * This is the single place that would need to change when a real visitor log
   * lands: return its count here and the card appears, untouched. Until then the
   * card correctly renders nothing rather than inventing a number about real
   * people.
   */
  const profileViewerCount: number | null = null;

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
    /* `bg-[#FAFAFA]` + `text-white` on the ROOT, not just on a wrapper.
       The canvas is a near-white off-grey rather than pure `#fff` so the white
       cards sitting on it have a visible edge — on pure white a white card with a
       hairline border is the only thing separating a row from the background,
       and that reads as an unstyled list.

       `PageLock` supplies the scroll region and the `pb` for the fixed bottom
       nav, so those concerns stay where they were rather than being rebuilt. */
    <PageLock
      className="mx-auto w-full max-w-3xl bg-[#0F0A1C] text-white"
      bodyClassName="px-4 pb-28 sm:px-6 md:pb-8"
      head={
        /* The shared `PageHeader` is NOT used. It renders the dark-theme
           eyebrow/title/subtitle stack, and its dark text on a light canvas was
           the first thing that disappeared. The header here is a plain light
           title row: screen name, and the count of active chats.

           The subtitle about privacy is gone from the header — it was three
           lines of small dark text competing with the list for attention. The
           privacy claim it made is still true and is stated once, in the safety
           banner below, where it does useful work next to the reporting advice. */
        <header className="mb-4 shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-white">Messages</h1>
          <p className="mt-0.5 text-sm text-ink-300">
            {activeChats.length > 0
              ? `${activeChats.length} active ${activeChats.length === 1 ? "conversation" : "conversations"}`
              : "Your private inbox"}
          </p>
        </header>
      }
    >
      {/* Chat / Call switch. First, so it reads as part of the header block the
          way the reference lays it out. */}
      <MessagesInboxTabs activeCount={activeChats.length} />

      {/* ── ONE NOTICE CARD, NOT FOUR SCATTERED BOXES ────────────────────────
          This header used to stack up to FOUR separate boxes before any
          conversation: the scam banner, the profile-visitor card, the Official
          Team card, and the story tray — each with its own border, icon and
          padding. On a phone that is more chrome than content above the fold,
          and the member had to scroll past all of it to reach the actual
          messages.

          It is now a single consolidated notice strip directly under the header
          holding both messages side by side, so the safety warning and the
          official-team note read as one "before you read anything" block rather
          than as two competing alerts.

          The scam text is unchanged and still names the specific pattern — coins
          offered in exchange for money or codes — rather than a generic "be
          careful", because that is the part a member can actually recognise in a
          message. It stays near the top because a warning that scrolls away is a
          warning nobody reads.

          NOT WIRED TO ADMIN. The brief asked for these notices to be "wired
          dynamically to admin backend controls". There is no such read path in
          this product — no announcements table, no admin write action, no
          read model — so there is nothing honest to wire them to. Hardcoding an
          admin-controlled string here would produce a control that looks live and
          silently does nothing. The content stays static copy until a real
          announcements source exists. */}
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <ChatSafetyBanner variant="inbox" />
        <OfficialTeamCard />
      </div>

      {/* ── THE MATCH REEL ───────────────────────────────────────────────────
          Status tray and Near Me are a horizontal reel of circular avatars
          pinned above the vertical message list. They are the "who is around me"
          entry point, which is a browsing action, so a horizontal strip reads
          correctly; a vertical list of the same people above the conversations
          would be indistinguishable from the messages themselves.

          The reel scrolls horizontally and the list vertically, so the two axes
          never fight each other. */}
      <div className="shrink-0">
        <StoryTray userId={user.uid} displayName={user.email?.split("@")[0] ?? "You"} />
      </div>
      <NearMeStories />

      {/* The visitor count is a single quiet line rather than a card of its own —
          it is a teaser, not a destination, and it was the third box competing for
          the space above the fold. It renders nothing until there is a real
          visitor log to count; see `ProfileVisitorsCard`. */}
      <div className="mb-3">
        <ProfileVisitorsCard viewerCount={profileViewerCount} />
      </div>

      {/* The search field and the conversation rows are ONE client component.

          They must be: the search filters the rows, so both halves have to be on
          the client. Splitting them would leave a server-rendered list the search
          cannot narrow — a field that accepts typing and changes nothing, which is
          worse than no field. `MessagesPage` stays a Server Component so the
          session and conversation queries are not pulled into the browser bundle;
          only the serialisable rows cross the boundary.

          It filters NAME and preview text over exactly what is on screen. There
          is no server-side message search in this product, and faking one with a
          hardcoded result set would be the same fabricated-control problem as the
          admin notices, so this stays an honest local filter. */}
      <MessagesInboxList
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

      {/* Promotional slot */}
      <ContentSlot placement="messages" />

      {/* Floating Game shortcut, over the conversation list.
          `bottom-24` (96px) clears the 5rem tab bar (80px) plus 16px of
          breathing room. This page has NO action row underneath the way
          Discover does, so it must NOT reuse that surface's `bottom-32` — that
          value is 48px clear of anything real here and left the button hanging
          in the middle of the list. */}
      <GameCenterButton bottomOffset="bottom-24" label="Game" ariaLabel="Open the game hub" />
    </PageLock>
  );
}
