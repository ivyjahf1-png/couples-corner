import type { Metadata } from "next";
import { requireUser, isRedirectOrNotFoundError } from "@/lib/auth/authorization";
import { PageLock } from "@/components/app/PageHeader";
import { ErrorState } from "@/components/app/ErrorState";
import { Button } from "@/components/ui/Button";
import { getLikesForUser, getPostLikesForUser } from "@/lib/server/likes";
import { LikesTabs } from "@/components/app/LikesTabs";
import { ContentSlot } from "@/components/content/ContentSlot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Likes | Couples Corner",
  description: "See who liked your profile and your posts.",
};

/**
 * Likes — two surfaces, split into tabs by <LikesTabs>:
 *
 * - Profile likes: a grid of (blurred) profile cards for everyone who liked
 *   THIS profile. Blurred placeholder likes (auto-injected by the bot onboarding
 *   system 2 days after registration) render blurred with a lock badge.
 * - Post likes: who reacted to each of this member's own moments.
 *
 * This page stays a Server Component: it does the data access and hands the
 * client tabs plain serialisable view models, so the tab switch needs no
 * round-trip. It also means the `server-only` boundary in lib/server/likes.ts is
 * never crossed by the client component.
 *
 * The old `return null` on a session failure rendered a BLANK page with no
 * explanation, which reads as a crash; it now renders a real error state.
 */
export default async function LikesPage() {
  let session: Awaited<ReturnType<typeof requireUser>> | null = null;
  try {
    session = await requireUser();
  } catch (error) {
    if (isRedirectOrNotFoundError(error)) throw error;
    return (
      <ErrorState
        title="We couldn't load your likes"
        body="Something went wrong on our side. Try again in a moment."
      />
    );
  }

  // Independent queries, so they run concurrently rather than in series.
  const [profileLikes, postLikes] = await Promise.all([
    getLikesForUser(session.uid),
    getPostLikesForUser(session.uid),
  ]);

  return (
    /* ── THE ONLY HEADER ON THIS SCREEN ────────────────────────────────────────
       `MobileBackHeader` returns `null` for `/likes` (see that component), so
       the bar that used to sit above this one — back arrow, "Likes" title, "Home"
       link — is gone entirely rather than merely restyled. One header, not two.

       THE TITLE PINS WITHOUT ANY SCROLL JAVASCRIPT, and that is deliberate.
       `PageLock`'s `head` slot is `flex: 0 0 auto` and sits OUTSIDE
       `.page-lock__body`, which is the route's only `overflow-y-auto` region.
       So anything in `head` is pinned above the scroll area by construction: it
       cannot scroll away, because it is not inside the thing that scrolls.

       This is why there is deliberately NO `IntersectionObserver` or scroll
       listener here, unlike `ProfileHeader` on /profile. That component has to
       listen because its bar cross-fades between two states; this one has a
       single state and simply stays put. Adding a listener to reproduce a
       guarantee the layout already provides would be dead code that can only
       break.

       The full-width `PageHeader` (eyebrow + subtitle + "Discover people" action)
       stays in the body as the page's opening block. It is CONTENT, not chrome —
       it scrolls with the likes, which is the point of a subtitle. The pinned bar
       above it carries only the screen's name. */
    <PageLock
      className="mx-auto w-full max-w-4xl"
      bodyClassName="flex flex-col gap-8 pb-8"
      head={
        <header className="flex min-h-16 items-center border-b border-white/5 bg-slate-950/80 px-4 py-3 backdrop-blur">
          <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-white">
            Who liked you
          </h1>
        </header>
      }
    >
      {/* ONE <h1> PER SCREEN. The pinned bar above is the screen's name and owns
          the only <h1>; repeating the same words as a second heading here made
          the document outline announce "Who liked you" twice to a screen-reader
          user and gave the page two competing top-level headings.

          What remains is the part that is genuinely CONTENT and should scroll:
          the explanatory subtitle and the route onward. `PageHeader` renders an
          <h1> unconditionally, so the subtitle is set directly here instead of
          reusing it. */}
      <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
        Everyone who tapped like on your profile or your posts — premium members
        can see and reply to every like.
      </p>
      <div>
        <Button href="/discover" variant="secondary">Discover people</Button>
      </div>

      <ContentSlot placement="matches" />

      <LikesTabs profileLikes={profileLikes} postLikes={postLikes} />
    </PageLock>
  );
}
