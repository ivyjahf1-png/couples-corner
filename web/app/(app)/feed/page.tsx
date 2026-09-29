import { redirect } from "next/navigation";
import { ImmersiveFeed } from "@/components/app/ImmersiveFeed";
import { requireUser } from "@/lib/auth/authorization";

/**
 * The Moment feed — the full-screen vertical video player.
 *
 * ── THE REGRESSION THIS FIXES ───────────────────────────────────────────────
 * This route was pointed at a static list of `PostCard` text/blog cards with a
 * create-post textarea above it. The bottom nav's "Moment" tab targets it, so
 * the tab a member taps to watch videos showed a blog instead. The immersive
 * player had not been removed — it still existed at `/` — but `/feed` was
 * serving an unrelated surface, and the nav had been pointed at it.
 *
 * `ImmersiveFeed` now owns the player, and BOTH `/` and `/feed` render it, so
 * there is exactly one implementation of the scroll-snap player, the overlay
 * chrome, the action rail and the sponsored card. Duplicating that markup
 * across two routes is how the two would silently drift again — which is
 * precisely the failure being fixed here.
 *
 * WHY `/` KEEPS ITS OWN ROUTE rather than redirecting here: `/` is what every
 * existing share link and invite deep link resolves to, and it is also the
 * Capacitor launch target. Redirecting it would cost a round trip and break the
 * URL. Two routes, one component.
 *
 * THIS ROUTE IS AUTHENTICATED (it lives under the `(app)` group and calls
 * `requireUser`). That is a deliberate change from the old blog list, which was
 * readable while signed out. The feed is a member surface: it is pre-populated
 * with personalised "you reacted" state and spends the member's tokens on the
 * sponsored card, so it is guarded like the rest of the app zone.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ moment?: string }>;
}) {
  const user = await requireUser();
  const { moment } = await searchParams;

  // A malformed id would be passed to a client component as an attribute, so
  // it is trimmed and length-capped before it travels. Same treatment as `/`.
  const deepLink = moment?.trim().slice(0, 64) || null;

  // Defence in depth: `requireUser()` above already guarantees a session, so
  // this is unreachable in practice. Kept so that if the guard is ever removed
  // from the layout, this route still cannot render a shell with no viewer id
  // (which would make every reaction look unowned).
  if (!user) redirect("/login");

  return <ImmersiveFeed viewerId={user.uid} deepLinkMomentId={deepLink} />;
}