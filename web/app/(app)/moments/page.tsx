import { MomentViewerCard, type MomentData } from "@/components/app/MomentViewerCard";
import { requireUser } from "@/lib/auth/authorization";
import { getRecentMoments } from "@/lib/server/tasks";

/**
 * `/moments` — the "Moment" screen: a single immersive moment player.
 *
 * ── REAL UPLOADS, NOT JUST THE DEMO ────────────────────────────────────────
 * The page fetches the LATEST moment from the same `moments` table the Task
 * Center upload form writes to (via `getRecentMoments`, which also maps stored
 * media URLs onto playable ones — bare storage keys and host-less storage
 * paths otherwise arrive here as unresolvable `src`s, the "my upload is
 * missing" symptom). The first row is handed to the card as its `moment`;
 * with no uploads yet the prop stays undefined and the card falls back to
 * its built-in demo, so the screen always renders.
 *
 * Fail-soft, like `ImmersiveFeed`: a database hiccup yields the demo card
 * rather than a 500 on the route.
 */
export default async function MomentsPage() {
  const session = await requireUser();

  const moments = await getRecentMoments(8, session.uid).catch(() => []);
  const latest = moments[0] ?? null;

  const moment: MomentData | undefined = latest
    ? {
        id: latest.id,
        authorName: latest.authorName?.trim() || "Member",
        timeAgo: relativeTime(latest.createdAt),
        mediaUrl: latest.mediaUrl,
        mediaType: latest.mediaType,
        avatarUrl: latest.authorAvatarUrl ?? undefined,
        likesCount: latest.reactionCount,
        isVerified: false,
      }
    : undefined;

  // DYNAMIC VIEWPORT LOCK. `h-[100dvh]` (not `100vh`) so the column tracks the
  // VISUAL viewport: when a mobile browser shrinks, the column shrinks with
  // it instead of overflowing. Bottom-anchored (`min-h-0` + `max-h-[100dvh]`)
  // as a flex child of `AppMain`'s padded box, so the player fills the
  // remaining space exactly. `overflow-hidden` keeps containment structural:
  // this screen owns no page scroll (the card is a locked reel), so any
  // future overflow fails inside the child rather than double-scrolling.
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-black/40">
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <MomentViewerCard moment={moment} uploadingTo={session.uid} />
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "";
  const seconds = Math.max(0, (Date.now() - parsed) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}