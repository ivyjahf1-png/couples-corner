import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CallScreen } from "@/components/app/CallScreen";
import { getCallPeerSummary } from "@/lib/server/messaging";
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
 *
 * ── WHY THIS NO LONGER CALLS `getConversationChatDataAction` ──────────────────
 * It used to. That function is exported from a `"use server"` module, which makes
 * it a Server Action, and a Server Action invoked from a Server Component RENDER
 * is not a supported call site — it is dispatched as a mutation rather than
 * called as a function, so tapping either call button landed on the route's
 * error boundary (`app/error.tsx` → `RecoveryScreen`) instead of the call
 * screen. That is the "broken error state" this route had.
 *
 * `getCallPeerSummary` is a plain `server-only` function called directly, and it
 * returns the one thing a call actually needs: who is on the other end. The
 * chat route has the same constraint and is fixed the same way — see
 * `messages/[conversationId]/page.tsx`.
 *
 * A call is the last screen that should depend on a message query succeeding,
 * so the two are independent now: a failure reading history cannot take down a
 * call, and a call cannot fail because a starter message could not be picked.
 *
 * `onClose` is intentionally `undefined`. `CallScreen.hangUp` calls
 * `call.stop()` and then `router.back()` itself, so passing a no-op here would
 * only duplicate the navigation — and passing a redirect would fight the back
 * gesture, stranding the member on a dead call URL. The hang-up button works
 * through the hook; this prop exists for hosts that own their own exit.
 */
export default async function CallPage({ params }: CallPageProps) {
  const { conversationId, mode: rawMode } = await params;
  const mode = parseMode(rawMode);
  if (!mode) notFound();

  const user = await getCurrentSessionUser();
  if (!user) notFound();

  /* Fail-soft: `getCallPeerSummary` returns null rather than throwing, so a
     database blip cannot crash the route. A null summary is NOT a 404 — it
     means "we could not identify the peer", and the call screen has a
     name-only fallback for exactly that. Only a conversation the viewer is not
     part of, or one that does not exist, is a genuine notFound. */
  const peer = await getCallPeerSummary(conversationId, user.uid).catch(() => null);
  if (!peer) notFound();

  return (
    <CallScreen
      mode={mode}
      summary={peer}
      conversationId={conversationId}
      currentUserId={user.uid}
      onClose={undefined}
    />
  );
}
