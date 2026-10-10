import { ImmersiveFeed } from "@/components/app/ImmersiveFeed";
import { requireUser } from "@/lib/auth/authorization";

/**
 * `/moments` — the "Moment" screen: the immersive vertical reel.
 *
 * ── DYNAMIC FEED, NOT A HARDCODED CLIP ──────────────────────────────────────
 * This screen used to render a single `MomentViewerCard` seeded with a
 * hardcoded demo video — and falling back to that clip whenever the table had
 * nothing — so "Moment" showed one static stream instead of the community's
 * uploads. That component is deleted.
 *
 * The page now renders `ImmersiveFeed`: the SAME scroll-snap reel the home
 * page (`/`) plays. It queries the public `moments` table newest-first — the
 * same table the Task Center upload form writes to, so anything a member
 * uploads is syndicated here immediately — and maps EVERY row into the reel
 * (photos and videos interleaved), with each moment's author stitched from
 * `profiles`.
 *
 * WHY THE AUTHOR IS NOT JOINED IN THE SELECT
 *   `supabase.from("moments").select("*, profiles(*)")` is NOT used
 *   deliberately: `moments.user_id` references `auth.users(id)` while
 *   `profiles.user_id` is only UNIQUE — there is no moments→profiles foreign
 *   key, so PostgREST rejects the embed and fails the ENTIRE query, and the
 *   rows read back as an empty array (the "I uploaded a video but the feed is
 *   empty" symptom). `getRecentMoments` (lib/server/tasks.ts) therefore
 *   selects the moment rows and fetches authors in their own query, stitching
 *   them in JS — see the long note above that function.
 *
 * EVERYTHING IS WIRED TO REAL ROWS: reactions (`setMomentReactionAction`),
 * comments (`addMomentCommentAction` / `getMomentCommentsAction`), share
 * (`shareOrCopy`), delete (`deleteMomentAction`) and the pinned upload FAB
 * (`/task/upload-moment`) all live in `MediaFeed` against the live
 * `moment_reactions` / `moment_comments` tables and storage buckets.
 * Reactions apply optimistically and reconcile against the server count.
 *
 * AUTHENTICATED: reactions, comments and deletion are member actions, so the
 * route is guarded like the rest of the app zone.
 */
export default async function MomentsPage({
  searchParams,
}: {
  searchParams: Promise<{ moment?: string }>;
}) {
  const session = await requireUser();
  const { moment } = await searchParams;

  /* LOCKED COLUMN, NOT A SECOND VIEWPORT. `h-full` fills the bounded box
     `AppMain` hands down (see its `h-full` inner wrapper); a bare
     `h-[100dvh]` here would measure the viewport a SECOND time and overflow
     that box by the shell chrome, pushing the reel's bottom controls under
     the fixed tab bar. `100dvh` survives only as `max-h`, the belt-and-braces
     cap the feed page uses. `overflow-hidden` keeps containment structural:
     this screen owns no page scroll — the only scroll region is `MediaFeed`'s
     inner snap scroller, one level down. `dvh` (not `vh`) so the cap tracks
     the VISUAL viewport when a mobile browser shrinks. */
  return (
    <div className="relative flex h-full max-h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden bg-black/40">
      {/* Deep link from a share link (`?moment=`): the reel opens scrolled to
          that moment instead of whatever card happens to be first. */}
      <ImmersiveFeed
        viewerId={session.uid}
        deepLinkMomentId={moment?.trim().slice(0, 64) || null}
      />
    </div>
  );
}