import { notFound } from "next/navigation";
import ConversationClient from "./ConversationClient";
import {
  getConversationChatDataAction,
  markConversationReadAction,
} from "@/lib/actions/messaging";
import { getCurrentSessionUser } from "@/lib/server/session";
import { getPresenceForUsers } from "@/lib/server/presence";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

/**
 * A single conversation thread.
 *
 * Layout contract - exactly one vertical scroll region:
 *   - Shell: `relative flex h-[100dvh] w-full flex-col overflow-hidden`. This
 *     page owns the full dynamic viewport because the app shell drops its
 *     `<main>` padding on this route (see `AppMain`), so nothing is
 *     subtracted from the measurement. The column is locked and never bounces.
 *
 *   - The bottom tab nav is HIDDEN on this route by `BottomNavRegion`, so the
 *     content region grows to fill the reclaimed space. `/messages` (the
 *     list) still shows the tab bar, so tapping the back arrow in
 *     `ChatHeader` brings the bar straight back.
 *   - `<header>` is `z-10 shrink-0`: locked at the top, never compressed or
 *     clipped, carrying the back arrow, avatar, name/status and call buttons.
 *   - The thread wrapper is `flex-1 min-h-0 overflow-y-auto overflow-x-hidden`:
 *     the ONLY scroller, explicitly bounded between header and composer.
 *   - The composer is `z-10 shrink-0` and owns its own safe-area inset, since
 *     nothing below it applies that clearance any more.
 *
 * NOTE: LiveConversationThread's `<ul>` must stay non-scrolling
 * (overflow-x-hidden only). Two nested overflow-y-auto containers cause scroll
 * chaining and the erratic bouncing this page used to have.
 */
export default async function MessagesPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  const user = await getCurrentSessionUser();

  const chatData = await getConversationChatDataAction(conversationId);
  if (!chatData || !user) {
    notFound();
  }

  const { summary, initialMessages, starter } = chatData;
  // Seed the header's presence so it paints the right state on the first frame
  // instead of flashing "Offline" until the client's first poll resolves.
  const otherId = summary?.id ?? null;
  const presence = otherId ? await getPresenceForUsers([otherId]) : {};
  const otherOnline = otherId ? Boolean(presence[otherId]?.online) : false;

  // Mark messages read on first load so the Chat tab badge clears.
  void markConversationReadAction(conversationId);

  return (
    <ConversationClient
      conversationId={conversationId}
      currentUserId={user.uid}
      summary={summary}
      starter={starter ?? null}
      initialMessages={initialMessages ?? []}
      initialOnline={otherOnline}
    />
  );
}
