import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CallScreen } from "@/components/app/CallScreen";
import { getConversationChatDataAction } from "@/lib/actions/messaging";
import { getCurrentSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Call | Couples Corner",
  description: "A private voice or video call.",
};

interface CallPageProps {
  params: Promise<{ conversationId: string; mode: string }>;
}

/** Only voice and video calls exist; anything else is a bad URL. */
function parseMode(raw: string): "audio" | "video" | null {
  if (raw === "audio") return "audio";
  if (raw === "video") return "video";
  return null;
}

/**
 * The 1-on-1 call surface, mounted OUTSIDE the app shell (see the
 * `(realtime)` layout) so the video is edge to edge with no navigation around
 * it.
 *
 * `?mode=` is read from the route segment rather than from a query string so
 * the two call types have distinct, shareable, cacheable URLs — `/call/<id>/video`
 * is what the chat header links to when the camera button is tapped.
 */
export default async function CallPage({ params }: CallPageProps) {
  const { conversationId, mode: rawMode } = await params;
  const mode = parseMode(rawMode);
  if (!mode) notFound();

  const [user, chatData] = await Promise.all([
    getCurrentSessionUser(),
    getConversationChatDataAction(conversationId).catch(() => null),
  ]);
  if (!user || !chatData) notFound();

  return (
    <CallScreen
      mode={mode}
      summary={chatData.summary}
      conversationId={conversationId}
      currentUserId={user.uid}
      onClose={() => undefined}
    />
  );
}
