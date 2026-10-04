import { notFound } from "next/navigation";
import ChatRoomClient from "./ChatRoomClient";
import { getConversationChatDataAction } from "@/lib/actions/messaging";
import { getCurrentSessionUser } from "@/lib/server/session";
import { getPresenceForUsers } from "@/lib/server/presence";
import { getGameWallet } from "@/lib/server/games";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

/**
 * A single conversation thread.
 *
 * Layout contract - exactly one vertical scroll region:
 *   - Shell: `relative flex h-[100dvh] w-full flex-col overflow-hidden`, owned by
 *     `ChatRoomClient`. This page drops the app shell's `<main>` padding on this
 *     route (see `AppMain`), so nothing is subtracted from that measurement and
 *     the column never bounces.
 *   - The bottom tab nav is HIDDEN here by `BottomNavRegion`, so the content
 *     region grows into the reclaimed space. `/messages` (the list) still shows
 *     the bar, so the back arrow brings it straight back.
 *   - Inside the client: header (shrink-0) / thread (flex-1 overflow-y-auto, the
 *     ONLY scroller) / composer (shrink-0).
 *
 * WHY CALL HISTORY IS NO LONGER FETCHED. The previous chat room merged `listCalls`
 * into the timeline as `MissedCallCard` rows. That card is gone with the rest of
 * the old chat room, and the new stream carries messages only, so fetching calls
 * here would be a round trip whose result nothing renders.
 *
 * NOTE: marking the thread read is NOT done here, and must not be.
 * It used to be `void markConversationReadAction(conversationId)` on this line,
 * which is invalid: this is a Server Component render, and that action calls
 * `revalidatePath`. Next.js rejects `revalidatePath` outside a mutation with
 * "used `revalidatePath` ... during render which is unsupported", so opening any
 * conversation threw. A render must also be side-effect free — writing `read_at`
 * from one means a write React can repeat on its own. `ChatRoomClient` calls it
 * from a mount effect instead, which is a genuine mutation context.
 */
export default async function MessagesPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  const user = await getCurrentSessionUser();

  const chatData = await getConversationChatDataAction(conversationId);
  if (!chatData || !user) {
    notFound();
  }

  const { summary, initialMessages } = chatData;
  // Seed presence so the header paints the right state on the first frame
  // instead of flashing "Offline" until the client's first poll resolves.
  const otherId = summary?.id ?? null;
  const presence = otherId ? await getPresenceForUsers([otherId]) : {};
  const otherOnline = otherId ? Boolean(presence[otherId]?.online) : false;

  /* COIN BALANCE, for the gift drawer's balance pill.
   *
   * A SECOND, INDEPENDENT READ rather than a column on the conversation query. The
   * conversation query is on the hot path for opening a chat, and joining a wallet
   * table into it to populate a drawer that most visits never open would slow down
   * every conversation for the sake of an optional panel. `getGameWallet` already
   * exists and is what `/store` and `/profile` read, so there is no new query to
   * write.
   *
   * It fails soft to 0: a wallet hiccup must not stop a member reading their
   * messages, and the drawer's Send button stays disabled at 0 until the next
   * open, which is a far better failure than a blank conversation. The DEBIT is
   * still authoritative - `sendGift` re-reads the balance server-side. */
  const wallet = await getGameWallet(user.uid).catch(() => ({ coinBalance: 0 }));

  return (
    <ChatRoomClient
      conversationId={conversationId}
      currentUserId={user.uid}
      summary={summary}
      initialMessages={initialMessages ?? []}
      initialOnline={otherOnline}
      coinBalance={wallet.coinBalance}
    />
  );
}
