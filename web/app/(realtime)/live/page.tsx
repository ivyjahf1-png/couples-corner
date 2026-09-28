import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoLiveRoom } from "@/components/app/GoLiveRoom";
import { getCurrentSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Go Live | Couples Corner",
  description: "Broadcast live to your audience and take gifts in real time.",
};

/**
 * "Go Live" entry point.
 *
 * The room id is the member's own uid, so a member has exactly one live room
 * and returning to the page rejoins the same broadcast rather than starting a
 * new one. Mounted outside the app shell (see the `(realtime)` layout) so the
 * broadcast owns the whole screen.
 *
 * Display name and avatar come from the session rather than a profile query:
 * the room only needs something to label the feed, and the layout has already
 * resolved the session, so a second round trip would just delay first paint.
 */
export default async function LivePage() {
  // The `(realtime)` layout already redirected unauthenticated visitors, so
  // this is only a type guard — but the session helper returns a nullable
  // type, so it has to be handled before the fields are read.
  const user = await getCurrentSessionUser();
  if (!user) notFound();

  return (
    <GoLiveRoom
      roomId={user.uid}
      selfId={user.uid}
      selfName={user.email ? user.email.split("@")[0] : "You"}
      isHost
      subtitle="Live now"
    />
  );
}
