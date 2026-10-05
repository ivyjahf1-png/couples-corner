import { ImmersiveFeed } from "@/components/app/ImmersiveFeed";
import { requireUser } from "@/lib/auth/authorization";

/**
 * `/moments` — the "Moment" screen: the immersive vertical video reel.
 *
 * ── WHY THIS IS NOW A REAL PAGE AND NOT A REDIRECT ────────────────────────────
 * It used to `redirect("/feed")`, which made Moment and Feed the SAME screen under
 * two names: a member tapping "Moment" expecting videos landed on a blog timeline,
 * with no indication that anything had been substituted. The bottom bar now has a
 * dedicated "Feed" tab, so the two are genuinely different destinations and must
 * have different content:
 *
 *   /moments -> this page, the immersive video player  (header reads "Moment")
 *   /feed    -> the chronological community timeline  (header reads "Feed")
 *
 * Both are guarded like the rest of the app zone: the player spends the member's
 * tokens on the sponsored card and shows personalised "you reacted" state, so it
 * is not a guest surface. `ImmersiveFeed` is still the SINGLE implementation of the
 * player - `/` renders it too, which is what every share link and the Capacitor
 * launch target resolve to. This route does not fork it.
 */
export default async function MomentsPage() {
  const user = await requireUser();
  /* `viewerId` is required: the player shows personalised "you reacted" state and
     spends this member's tokens on the sponsored card, so it cannot render as an
     anonymous player. */
  return <ImmersiveFeed viewerId={user.uid} />;
}