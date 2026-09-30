import Link from "next/link";
import { PageLock } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Avatar, PresenceDot } from "@/components/app/Avatar";
import { ContentSlot } from "@/components/content/ContentSlot";
import { NearMeStories } from "@/components/app/NearMeStories";
import { StoryTray } from "@/components/app/StoryTray";
import { MessagesInboxTabs } from "@/components/app/MessagesInboxTabs";
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
      bodyClassName="pb-28 md:pb-8"
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

      {/* Scam warning. LOUD variant: this is the surface unsolicited contact
          actually arrives on, and the specific pattern — coins offered in
          exchange for money or codes — is named rather than a generic "be
          careful", so a member can recognise it in a message.

          It sits directly under the header, above everything else, because a
          warning that scrolls away is a warning nobody reads. */}
      <div className="mb-4">
        <ChatSafetyBanner variant="inbox" />
      </div>

      {/* Status tray sits directly under the header; only the chat list
          below it scrolls. */}
      <div className="shrink-0">
        <StoryTray userId={user.uid} displayName={user.email?.split("@")[0] ?? "You"} />
      </div>

      {/* Near me — horizontal scrollable circular avatars (location-aware). */}
      <NearMeStories />

      {/* Informational cards, above the conversations so they are read while
          the list is still coming into view. */}
      <div className="mb-3 flex flex-col gap-2.5">
        <ProfileVisitorsCard viewerCount={profileViewerCount} />
        <OfficialTeamCard />
      </div>

      {activeChats.length === 0 ? (
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
      ) : (
        <section aria-labelledby="chats-heading" className="flex flex-col gap-3">
          <h2 id="chats-heading" className="text-xs font-semibold uppercase tracking-wide text-ink-300">
            Active chats <span className="text-ink-400">({activeChats.length})</span>
          </h2>

          {/* WHITE CARDS on the off-white canvas, one per row, with a hairline
              border and rounded corners.

              These were previously a flat borderless list sitting directly on
              the dark canvas. On `#FAFAFA` a borderless white row is
              indistinguishable from the background, so the list read as one
              undifferentiated block — the border and radius are what make each
              conversation a discrete, tappable target. */}
          <ul className="flex flex-col gap-2">
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
    /* One white CARD per conversation, not a borderless row on the canvas.
       `active:scale-[0.99]` gives the press feedback a tap target needs on
       touch, where there is no hover cursor to rely on. */
    <Link
      href={conversation.href as never}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-3 transition active:scale-[0.99] hover:border-white/20 hover:bg-white/[0.04] sm:gap-4"
    >
      <div className="relative shrink-0">
        {conversation.avatarUrl ? (
          <img
            src={conversation.avatarUrl}
            alt={name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          /* Initials fallback. The dark `bg-brand-500/15 text-brand-300` tint was
             near-invisible on white, so this is a solid warm fill with dark text
             that reads as an avatar rather than as empty space. */
          <Avatar name={name} kind={conversation.kind} size="md" className="bg-brand-500/15 text-brand-300" />
        )}
        {/* Bots have no real presence, so they get no dot; humans always get one
            so an offline member reads as offline rather than ambiguous. */}
        {conversation.isBot ? null : (
          <PresenceDot online={conversation.isOnline} size="md" />
        )}
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
        {/* Always `font-semibold`: the reference gives every name equal weight and
            lets the preview and the unread badge carry the emphasis instead.
            Weighting the name by unread state made half the list look disabled. */}
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {/* `text-ink-300`, not the dark `text-ink-400`/`text-ink-200` tokens
            used before. On `#FAFAFA` those resolved to roughly 2:1 contrast and
            the previews looked like empty space. 500 is the lightest shade that
            still clears WCAG AA at this size on this background. */}
        <p className="truncate text-xs text-ink-300">
          {conversation.preview?.trim() || "No messages yet"}
        </p>
      </div>

      {at ? (
        <span
          className={[
            "shrink-0 text-[11px]",
            unread > 0 ? "font-semibold text-brand-300" : "text-ink-400",
          ].join(" ")}
        >
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


